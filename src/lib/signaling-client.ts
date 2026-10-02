// Universal Signaling Client for ZeroCloud
// Supports both dedicated persistent WebSockets (server.js / Render / Railway)
// and automatic serverless WebRTC signaling relay (Netlify / Vercel / GitHub Pages).

import { getSignalingUrl } from './webrtc';
import { SignalingMessage } from './types';

export interface ISignalingClient {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((error: any) => void) | null;
  onclose: (() => void) | null;
}

export interface SignalingClientOptions {
  sessionId: string;
  role: 'sender' | 'receiver';
  shortCode?: string;
}

/**
 * Determines whether the current environment is running on a serverless/static host
 * (like Netlify or Vercel) where custom Node.js WebSocket servers cannot run on the same domain.
 */
function isServerlessHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev')
  );
}

/**
 * Open, zero-cost, persistent pub-sub relay for serverless environments.
 * Delivers instant WebSocket push notifications without requiring API keys or credit cards.
 */
class ServerlessRelayClient implements ISignalingClient {
  private topic: string;
  private role: 'sender' | 'receiver';
  private sessionId: string;
  private shortCode?: string;
  private ws: WebSocket | null = null;
  private codeWs: WebSocket | null = null;
  public readyState: number = 0; // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public onclose: (() => void) | null = null;

  constructor(options: SignalingClientOptions) {
    this.sessionId = options.sessionId || '';
    this.shortCode = options.shortCode;
    this.role = options.role;
    this.topic = this.sessionId ? `zerocloud-sig-${this.sessionId}` : `zerocloud-sig-${this.shortCode}`;
    this.init();
  }

  private init() {
    try {
      const relayWsUrl = `wss://ntfy.sh/${this.topic}/ws`;
      this.ws = new WebSocket(relayWsUrl);

      this.ws.onopen = () => {
        this.readyState = 1;
        if (this.onopen) this.onopen();
      };

      this.ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === 'message' && envelope.message) {
            const parsed = JSON.parse(envelope.message);
            // Ignore messages sent by self
            if (parsed.from !== this.role) {
              let msg = parsed.msg as SignalingMessage;

              // If receiver joined by short code and received session_joined, upgrade topic
              if (this.role === 'receiver' && msg.type === 'session_joined' && msg.sessionId) {
                this.sessionId = msg.sessionId;
                const newTopic = `zerocloud-sig-${this.sessionId}`;
                if (this.topic !== newTopic) {
                  this.topic = newTopic;
                  try {
                    this.ws?.close();
                  } catch {}
                  this.ws = new WebSocket(`wss://ntfy.sh/${this.topic}/ws`);
                  this.ws.onmessage = this.handleWsMessage.bind(this);
                }
              }

              // Translate message semantics if needed
              if (this.role === 'sender' && msg.type === ('join_session' as any)) {
                msg = {
                  type: 'receiver_requested',
                  sessionId: this.sessionId,
                  sasCode: (msg as any).sasCode || null,
                } as any;
              } else if (this.role === 'receiver' && msg.type === ('approve_receiver' as any)) {
                msg = {
                  type: 'receiver_approved',
                  sessionId: this.sessionId,
                } as any;
              }

              if (this.onmessage) {
                this.onmessage({ data: JSON.stringify(msg) });
              }
            }
          }
        } catch (err) {
          console.warn('Relay message parsing error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Relay socket error:', err);
        if (this.onerror) this.onerror(err);
      };

      this.ws.onclose = () => {
        this.readyState = 3;
        if (this.onclose) this.onclose();
      };

      // If sender has a shortCode, also listen on the shortCode channel to resolve receiver requests
      if (this.role === 'sender' && this.shortCode) {
        const codeTopic = `zerocloud-sig-${this.shortCode}`;
        this.codeWs = new WebSocket(`wss://ntfy.sh/${codeTopic}/ws`);
        this.codeWs.onmessage = (event) => {
          try {
            const envelope = JSON.parse(event.data);
            if (envelope.event === 'message' && envelope.message) {
              const parsed = JSON.parse(envelope.message);
              if (parsed.from === 'receiver' && parsed.msg?.type === 'join_session') {
                // Reply with session_joined so receiver knows the sessionId
                fetch(`https://ntfy.sh/${codeTopic}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    from: 'sender',
                    msg: {
                      type: 'session_joined',
                      sessionId: this.sessionId,
                      shortCode: this.shortCode,
                    },
                  }),
                }).catch(() => {});

                // Also trigger sender's receiver_requested
                if (this.onmessage) {
                  this.onmessage({
                    data: JSON.stringify({
                      type: 'receiver_requested',
                      sessionId: this.sessionId,
                      sasCode: parsed.msg.sasCode || null,
                    }),
                  });
                }
              }
            }
          } catch {}
        };
      }
    } catch (err) {
      this.readyState = 3;
      if (this.onerror) this.onerror(err);
    }
  }

  private handleWsMessage(event: MessageEvent) {
    try {
      const envelope = JSON.parse(event.data);
      if (envelope.event === 'message' && envelope.message) {
        const parsed = JSON.parse(envelope.message);
        if (parsed.from !== this.role) {
          let msg = parsed.msg as SignalingMessage;
          if (this.role === 'receiver' && msg.type === ('approve_receiver' as any)) {
            msg = {
              type: 'receiver_approved',
              sessionId: this.sessionId,
            } as any;
          }
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(msg) });
          }
        }
      }
    } catch (err) {
      console.warn('Relay message parsing error:', err);
    }
  }

  send(data: string): void {
    try {
      const parsedMsg = typeof data === 'string' ? JSON.parse(data) : data;
      const payload = JSON.stringify({
        from: this.role,
        msg: parsedMsg,
      });

      // Post over HTTPS to ntfy pub-sub broker
      fetch(`https://ntfy.sh/${this.topic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': `ZeroCloud Signaling ${this.role}`,
        },
        body: payload,
      }).catch((err) => {
        console.error('Relay publish error:', err);
      });
    } catch (err) {
      console.error('Failed to send relay signal:', err);
    }
  }

  close(): void {
    this.readyState = 3;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.codeWs) {
      try {
        this.codeWs.close();
      } catch {}
      this.codeWs = null;
    }
    if (this.onclose) this.onclose();
  }
}

/**
 * Creates a universal signaling client that automatically uses:
 * 1. Dedicated WebSocket server if NEXT_PUBLIC_WS_URL is provided, or
 * 2. Local Node.js server if running locally/on a persistent server, or
 * 3. Automatic Serverless Relay (ntfy.sh) if deployed on Netlify, Vercel, or when local WS is unavailable.
 */
export function createSignalingClient(options: SignalingClientOptions): ISignalingClient {
  // If explicitly configured with a dedicated WS URL, use direct WebSocket
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return new WebSocket(process.env.NEXT_PUBLIC_WS_URL) as unknown as ISignalingClient;
  }

  // If deployed on serverless hosting (Netlify, Vercel, etc.), use the serverless relay directly
  if (isServerlessHost()) {
    console.info('ZeroCloud: Serverless host detected (Netlify/Vercel). Using instant zero-config WebRTC relay.');
    return new ServerlessRelayClient(options);
  }

  // Otherwise, try connecting to the local WebSocket server with automatic fallback
  const directWsUrl = getSignalingUrl();
  let fallbackClient: ServerlessRelayClient | null = null;
  let hasFallenBack = false;

  const clientWrapper: ISignalingClient = {
    readyState: 0,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send(data: string) {
      if (fallbackClient) {
        fallbackClient.send(data);
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    },
    close() {
      if (fallbackClient) {
        fallbackClient.close();
      } else if (ws) {
        ws.close();
      }
      this.readyState = 3;
    },
  };

  let ws: WebSocket;
  try {
    ws = new WebSocket(directWsUrl);
  } catch {
    console.info('Direct WebSocket unavailable. Falling back to serverless signaling relay.');
    return new ServerlessRelayClient(options);
  }

  const triggerFallback = () => {
    if (hasFallenBack) return;
    hasFallenBack = true;
    console.info('ZeroCloud: Primary WebSocket connection failed. Seamlessly activating serverless signaling relay.');
    try {
      ws.close();
    } catch {}

    fallbackClient = new ServerlessRelayClient(options);
    fallbackClient.onopen = () => {
      clientWrapper.readyState = 1;
      if (clientWrapper.onopen) clientWrapper.onopen();
    };
    fallbackClient.onmessage = (e) => {
      if (clientWrapper.onmessage) clientWrapper.onmessage(e);
    };
    fallbackClient.onerror = (e) => {
      if (clientWrapper.onerror) clientWrapper.onerror(e);
    };
    fallbackClient.onclose = () => {
      clientWrapper.readyState = 3;
      if (clientWrapper.onclose) clientWrapper.onclose();
    };
  };

  // Timeout if direct connection hangs
  const connTimeout = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      triggerFallback();
    }
  }, 2500);

  ws.onopen = () => {
    clearTimeout(connTimeout);
    clientWrapper.readyState = 1;
    if (clientWrapper.onopen) clientWrapper.onopen();
  };

  ws.onmessage = (e) => {
    if (clientWrapper.onmessage) clientWrapper.onmessage({ data: e.data });
  };

  ws.onerror = (err) => {
    clearTimeout(connTimeout);
    triggerFallback();
  };

  ws.onclose = () => {
    clearTimeout(connTimeout);
    if (!hasFallenBack && clientWrapper.readyState === 0) {
      triggerFallback();
    } else {
      clientWrapper.readyState = 3;
      if (clientWrapper.onclose) clientWrapper.onclose();
    }
  };

  return clientWrapper;
}
