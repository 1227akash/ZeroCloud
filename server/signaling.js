// Minimal Zero-Knowledge WebRTC Signaling Server for ZeroCloud
// Relays ONLY SDP offers/answers and ICE candidates.
// NEVER receives, inspects, or logs file names, contents, or encryption keys.

const { WebSocketServer, WebSocket } = require('ws');

class SignalingService {
  constructor(options = {}) {
    this.sessions = new Map();
    this.localPeers = new Map(); // ws -> { id, name, device, ip }
    this.ipLimits = new Map(); // IP -> { count, resetTime }
    this.socketLimits = new Map(); // ws -> { count, resetTime }
    this.RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    this.MAX_CONNS_PER_IP = 40;
    this.MAX_MSGS_PER_SOCKET = 120;
    this.MAX_MESSAGE_BYTES = 64 * 1024; // 64 KB max for SDP/ICE payloads
  }

  isRateLimited(ip) {
    const now = Date.now();
    const limit = this.ipLimits.get(ip);
    if (!limit || now > limit.resetTime) {
      this.ipLimits.set(ip, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return false;
    }
    limit.count++;
    return limit.count > this.MAX_CONNS_PER_IP;
  }

  isSocketRateLimited(ws) {
    const now = Date.now();
    const limit = this.socketLimits.get(ws);
    if (!limit || now > limit.resetTime) {
      this.socketLimits.set(ws, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return false;
    }
    limit.count++;
    return limit.count > this.MAX_MSGS_PER_SOCKET;
  }

  init(server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws' || url.pathname === '/signaling') {
        const ip = request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || 'unknown';
        if (this.isRateLimited(ip)) {
          socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      ws.peerId = Math.random().toString(36).substring(2, 10);
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('message', (data) => {
        try {
          if (data.length > this.MAX_MESSAGE_BYTES) {
            this.sendError(ws, 'MESSAGE_TOO_LARGE', 'Signal payload exceeds maximum permitted size.');
            return;
          }

          if (this.isSocketRateLimited(ws)) {
            this.sendError(ws, 'RATE_LIMITED', 'Too many signal messages. Please wait.');
            return;
          }

          let msg;
          try {
            msg = JSON.parse(data.toString('utf8'));
          } catch (err) {
            this.sendError(ws, 'BAD_REQUEST', 'Invalid JSON message');
            return;
          }

          if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
            this.sendError(ws, 'BAD_REQUEST', 'Message payload must be a JSON object');
            return;
          }

          this.handleMessage(ws, msg);
        } catch (err) {
          this.sendError(ws, 'INTERNAL_ERROR', 'Unexpected message processing error');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
        this.socketLimits.delete(ws);
      });

      ws.on('error', () => {
        this.handleDisconnect(ws);
        this.socketLimits.delete(ws);
      });
    });

    // Heartbeat every 30s to keep connections healthy through firewalls
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
      this.cleanupStaleSessions();
    }, 30000);
  }

  handleMessage(ws, msg) {
    const { type, sessionId, shortCode, payload, sasCode } = msg;

    if (!type || typeof type !== 'string') {
      return this.sendError(ws, 'BAD_REQUEST', 'Valid message type required');
    }

    if (sessionId && (typeof sessionId !== 'string' || sessionId.length > 128 || !/^[a-zA-Z0-9_\-]+$/.test(sessionId))) {
      return this.sendError(ws, 'INVALID_SESSION_ID', 'Invalid session ID format.');
    }

    switch (type) {
      case 'create_session': {
        if (!sessionId || typeof sessionId !== 'string') {
          return this.sendError(ws, 'INVALID_SESSION_ID', 'Session ID required');
        }

        // Clean up previous if sender had one
        this.cleanupSocket(ws);

        const session = {
          id: sessionId,
          shortCode: shortCode || sessionId.slice(0, 6).toUpperCase(),
          senderWs: ws,
          receiverWs: null,
          isApproved: false,
          isRevoked: false,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          approvedReceiverId: null,
        };

        ws.sessionId = sessionId;
        ws.isSender = true;
        this.sessions.set(sessionId, session);

        this.send(ws, {
          type: 'session_created',
          sessionId,
          shortCode: session.shortCode,
        });
        break;
      }

      case 'join_session': {
        const targetSessionId = sessionId;
        const targetShortCode = shortCode?.trim().toUpperCase();

        let session = null;
        if (targetSessionId && this.sessions.has(targetSessionId)) {
          session = this.sessions.get(targetSessionId);
        } else if (targetShortCode) {
          for (const s of this.sessions.values()) {
            if (s.shortCode === targetShortCode) {
              session = s;
              break;
            }
          }
        }

        if (!session) {
          return this.sendError(ws, 'SESSION_NOT_FOUND', 'Transfer session not found or has expired.');
        }

        if (session.isRevoked) {
          return this.sendError(ws, 'SESSION_REVOKED', 'This transfer session has been revoked by the sender.');
        }

        // Check single-receiver lock
        if (session.isApproved || (session.receiverWs && session.receiverWs !== ws && session.receiverWs.readyState === WebSocket.OPEN)) {
          return this.sendError(
            ws,
            'SESSION_LOCKED',
            'This session is locked to another receiver. Only one receiver is permitted.'
          );
        }

        session.receiverWs = ws;
        session.lastActivity = Date.now();
        ws.sessionId = session.id;
        ws.isSender = false;

        this.send(ws, {
          type: 'session_joined',
          sessionId: session.id,
          shortCode: session.shortCode,
        });

        // Notify sender that a receiver wants to connect
        if (session.senderWs && session.senderWs.readyState === WebSocket.OPEN) {
          this.send(session.senderWs, {
            type: 'receiver_requested',
            sessionId: session.id,
            sasCode: sasCode || null,
          });
        }
        break;
      }

      case 'approve_receiver': {
        const session = this.sessions.get(sessionId);
        if (!session || session.senderWs !== ws) {
          return this.sendError(ws, 'UNAUTHORIZED', 'Only the sender can approve receivers.');
        }

        if (session.isRevoked) {
          return this.sendError(ws, 'SESSION_REVOKED', 'Session has been revoked.');
        }

        if (!session.receiverWs || session.receiverWs.readyState !== WebSocket.OPEN) {
          return this.sendError(ws, 'NO_RECEIVER', 'No active receiver to approve.');
        }

        session.isApproved = true;
        session.lastActivity = Date.now();

        // Notify receiver of approval
        this.send(session.receiverWs, {
          type: 'receiver_approved',
          sessionId: session.id,
        });

        // Confirm to sender
        this.send(ws, {
          type: 'approval_confirmed',
          sessionId: session.id,
        });
        break;
      }

      case 'reject_receiver': {
        const session = this.sessions.get(sessionId);
        if (!session || session.senderWs !== ws) return;

        if (session.receiverWs && session.receiverWs.readyState === WebSocket.OPEN) {
          this.send(session.receiverWs, {
            type: 'receiver_rejected',
            reason: 'Sender rejected the connection request.',
          });
          session.receiverWs.close(1000, 'Rejected by sender');
        }
        session.receiverWs = null;
        session.isApproved = false;
        break;
      }

      case 'revoke_session': {
        const session = this.sessions.get(sessionId);
        if (!session || session.senderWs !== ws) return;

        session.isRevoked = true;
        if (session.receiverWs && session.receiverWs.readyState === WebSocket.OPEN) {
          this.send(session.receiverWs, {
            type: 'session_revoked',
            reason: 'Sender revoked this transfer session.',
          });
          session.receiverWs.close(1000, 'Session revoked');
        }
        this.sessions.delete(sessionId);
        this.send(ws, { type: 'session_revoked_confirmed' });
        break;
      }

      case 'signal': {
        // Relay WebRTC SDP or ICE candidate
        const session = this.sessions.get(sessionId);
        if (!session || session.isRevoked) {
          return this.sendError(ws, 'INVALID_SESSION', 'Session invalid or revoked.');
        }

        // Strict authorization: ws must be sender or receiver of this specific session
        if (ws !== session.senderWs && ws !== session.receiverWs) {
          return this.sendError(ws, 'UNAUTHORIZED', 'Not an authorized participant in this session.');
        }

        // Enforce that the receiver was approved before forwarding signals
        if (!session.isApproved) {
          return this.sendError(ws, 'SESSION_NOT_APPROVED', 'Transfer session has not been approved yet.');
        }

        session.lastActivity = Date.now();

        if (ws === session.senderWs) {
          // Forward from sender to approved receiver
          if (session.receiverWs && session.receiverWs.readyState === WebSocket.OPEN) {
            this.send(session.receiverWs, {
              type: 'signal',
              sessionId,
              payload,
            });
          }
        } else if (ws === session.receiverWs) {
          // Forward from approved receiver to sender
          if (session.senderWs && session.senderWs.readyState === WebSocket.OPEN) {
            this.send(session.senderWs, {
              type: 'signal',
              sessionId,
              payload,
            });
          }
        }
        break;
      }

      case 'local_announce': {
        const name = String(msg.name || 'Anonymous Peer').slice(0, 32);
        const device = String(msg.device || 'Browser').slice(0, 32);
        this.localPeers.set(ws, { id: ws.peerId, name, device, ip: ws.clientIp });
        this.broadcastLocalPeers(ws.clientIp);
        break;
      }

      case 'local_leave': {
        if (this.localPeers.has(ws)) {
          const ip = ws.clientIp;
          this.localPeers.delete(ws);
          this.broadcastLocalPeers(ip);
        }
        break;
      }

      case 'local_invite': {
        const { targetPeerId, sessionId, shortCode, shareUrl, metadata } = msg;
        if (!targetPeerId) return;
        for (const [socket, info] of this.localPeers.entries()) {
          if (info.id === targetPeerId && info.ip === ws.clientIp && socket.readyState === WebSocket.OPEN) {
            const senderInfo = this.localPeers.get(ws) || { name: 'Nearby Device' };
            this.send(socket, {
              type: 'local_invite_received',
              fromPeerId: ws.peerId,
              fromName: senderInfo.name,
              sessionId,
              shortCode,
              shareUrl,
              metadata: metadata || null,
            });
            break;
          }
        }
        break;
      }

      default:
        this.sendError(ws, 'UNKNOWN_TYPE', `Unknown signal type: ${type}`);
    }
  }

  broadcastLocalPeers(ip) {
    if (!ip) return;
    const peersOnIp = [];
    for (const [socket, info] of this.localPeers.entries()) {
      if (info.ip === ip && socket.readyState === WebSocket.OPEN) {
        peersOnIp.push({ id: info.id, name: info.name, device: info.device });
      }
    }
    for (const [socket, info] of this.localPeers.entries()) {
      if (info.ip === ip && socket.readyState === WebSocket.OPEN) {
        this.send(socket, {
          type: 'local_peers_update',
          myId: info.id,
          peers: peersOnIp.filter(p => p.id !== info.id),
        });
      }
    }
  }

  handleDisconnect(ws) {
    if (this.localPeers.has(ws)) {
      const ip = ws.clientIp;
      this.localPeers.delete(ws);
      this.broadcastLocalPeers(ip);
    }

    for (const [id, session] of this.sessions.entries()) {
      if (session.senderWs === ws) {
        // Sender tab closed or disconnected
        if (session.receiverWs && session.receiverWs.readyState === WebSocket.OPEN) {
          this.send(session.receiverWs, {
            type: 'peer_disconnected',
            peer: 'sender',
            message: 'Sender closed their tab or disconnected.',
          });
        }
        this.sessions.delete(id);
      } else if (session.receiverWs === ws) {
        // Receiver disconnected
        session.receiverWs = null;
        session.isApproved = false;
        if (session.senderWs && session.senderWs.readyState === WebSocket.OPEN) {
          this.send(session.senderWs, {
            type: 'peer_disconnected',
            peer: 'receiver',
            message: 'Receiver disconnected.',
          });
        }
      }
    }
  }

  cleanupSocket(ws) {
    for (const [id, session] of this.sessions.entries()) {
      if (session.senderWs === ws) {
        this.sessions.delete(id);
      } else if (session.receiverWs === ws) {
        session.receiverWs = null;
        session.isApproved = false;
      }
    }
  }

  cleanupStaleSessions() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(id);
      }
    }

    // Prune expired IP rate limit records to prevent unbounded memory growth
    for (const [ip, limit] of this.ipLimits.entries()) {
      if (now > limit.resetTime) {
        this.ipLimits.delete(ip);
      }
    }
  }

  send(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  sendError(ws, code, message) {
    this.send(ws, { type: 'error', code, message });
  }

  close() {
    clearInterval(this.pingInterval);
    if (this.wss) this.wss.close();
  }
}

module.exports = { SignalingService };
