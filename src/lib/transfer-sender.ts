import {
  generateSessionKey,
  generateSessionToken,
  generateShortCode,
  deriveSasCode,
  encryptChunk,
  bufferToBase64Url,
  computeSha256,
  IncrementalSha256,
} from './crypto';
import {
  CHUNK_SIZE,
  BUFFER_THRESHOLD,
  getRtcConfiguration,
  getSignalingUrl,
  WakeLockManager,
} from './webrtc';
import { FileMetadata, TransferProgress, TransferStatus, SignalingMessage } from './types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB

export class TransferSender {
  public file: File;
  public sessionId: string;
  public shortCode: string;
  public rawKeyBase64: string = '';
  public sasCode: string = '';
  public salt: Uint8Array = new Uint8Array(12);

  private key: CryptoKey | null = null;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private wakeLock = new WakeLockManager();

  private isPaused = false;
  private isCancelled = false;
  private currentChunk = 0;
  private totalChunks = 0;
  private bytesTransferred = 0;
  private startTime = 0;
  private lastProgressTime = 0;
  private lastBytesTransferred = 0;
  private currentSpeed = 0;

  private onProgressCb: ((progress: TransferProgress) => void) | null = null;
  private onStatusCb: ((status: TransferStatus, error?: string) => void) | null = null;

  constructor(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum allowed size of 10 GB (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB).`);
    }
    this.file = file;
    this.sessionId = generateSessionToken();
    this.shortCode = generateShortCode();
    this.totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  }

  onProgress(cb: (progress: TransferProgress) => void) {
    this.onProgressCb = cb;
  }

  onStatus(cb: (status: TransferStatus, error?: string) => void) {
    this.onStatusCb = cb;
  }

  async initialize(): Promise<{ shareUrl: string; shortCode: string; sasCode: string }> {
    const cryptoSession = await generateSessionKey();
    this.key = cryptoSession.key;
    this.rawKeyBase64 = cryptoSession.rawKeyBase64;
    this.salt = cryptoSession.salt;

    this.sasCode = await deriveSasCode(this.sessionId, this.salt);

    // Build the share link with the key strictly inside URL fragment (#key=...)
    // Fragment is NEVER sent to web servers or signaling.
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const shareUrl = `${baseUrl}/receive?session=${this.sessionId}#key=${this.rawKeyBase64}`;

    await this.connectSignaling();

    return {
      shareUrl,
      shortCode: this.shortCode,
      sasCode: this.sasCode,
    };
  }

  private connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.updateStatus('connecting');
      const wsUrl = getSignalingUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws?.send(
          JSON.stringify({
            type: 'create_session',
            sessionId: this.sessionId,
            shortCode: this.shortCode,
          })
        );
        this.updateStatus('waiting_for_receiver');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data);
          this.handleSignalingMessage(msg);
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Signaling error:', err);
        this.updateStatus('error', 'Unable to connect to signaling server.');
        reject(err);
      };

      this.ws.onclose = () => {
        if (!this.isCancelled && this.currentChunk < this.totalChunks) {
          console.warn('Signaling closed.');
        }
      };
    });
  }

  private handleSignalingMessage(msg: SignalingMessage) {
    switch (msg.type) {
      case 'receiver_requested':
        this.updateStatus('receiver_pending_approval');
        break;

      case 'session_locked':
      case 'error':
        this.updateStatus('error', msg.message || 'Transfer session error');
        break;

      case 'peer_disconnected':
        this.updateStatus('error', 'Receiver disconnected.');
        this.cleanup();
        break;

      case 'signal':
        this.handlePeerSignal(msg.payload);
        break;
    }
  }

  /**
   * Sender explicitly clicks "Approve this receiver" after checking SAS code
   */
  async approveReceiver() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Signaling connection is closed.');
    }

    this.updateStatus('approved');

    // Notify signaling server
    this.ws.send(
      JSON.stringify({
        type: 'approve_receiver',
        sessionId: this.sessionId,
      })
    );

    await this.setupPeerConnection();
  }

  /**
   * Sender rejects this receiver
   */
  rejectReceiver() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'reject_receiver',
          sessionId: this.sessionId,
        })
      );
    }
    this.updateStatus('waiting_for_receiver');
  }

  /**
   * Revoke session completely
   */
  revokeSession() {
    this.isCancelled = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'revoke_session',
          sessionId: this.sessionId,
        })
      );
    }
    this.cleanup();
    this.updateStatus('revoked');
  }

  private async setupPeerConnection() {
    this.updateStatus('connecting');
    const rtcConfig = getRtcConfiguration();
    this.pc = new RTCPeerConnection(rtcConfig);

    // Relay ICE candidates via signaling
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'signal',
            sessionId: this.sessionId,
            payload: { candidate: event.candidate },
          })
        );
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
        this.updateStatus('error', 'WebRTC connection interrupted.');
      }
    };

    // Create reliable data channel for transfer
    this.dc = this.pc.createDataChannel('zerocloud-transfer', {
      ordered: true,
    });
    this.dc.binaryType = 'arraybuffer';
    this.dc.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

    this.dc.onopen = () => {
      this.startTransfer();
    };

    this.dc.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          this.handleDataChannelMessage(msg);
        }
      } catch (err) {
        console.error('DataChannel message parse error:', err);
      }
    };

    // Create and send SDP Offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.ws?.send(
      JSON.stringify({
        type: 'signal',
        sessionId: this.sessionId,
        payload: { sdp: this.pc.localDescription },
      })
    );
  }

  private async handlePeerSignal(payload: any) {
    if (!this.pc) return;

    if (payload.sdp) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    } else if (payload.candidate) {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }

  private handleDataChannelMessage(msg: any) {
    if (msg.type === 'chunk_ack') {
      // Receiver acknowledged chunk index
    } else if (msg.type === 'control') {
      if (msg.action === 'pause') {
        this.isPaused = true;
        this.updateStatus('paused');
      } else if (msg.action === 'resume') {
        this.isPaused = false;
        this.updateStatus('transferring');
      }
    } else if (msg.type === 'integrity_verified') {
      if (msg.success) {
        this.updateStatus('completed');
      } else {
        this.updateStatus('error', 'Integrity hash mismatch on receiver!');
      }
      this.wakeLock.release();
    }
  }

  private async startTransfer() {
    if (!this.dc || this.dc.readyState !== 'open' || !this.key) return;

    this.updateStatus('transferring');
    this.wakeLock.request();
    this.startTime = Date.now();
    this.lastProgressTime = this.startTime;

    const hasher = new IncrementalSha256();

    // Send initial metadata
    const metadata: FileMetadata = {
      name: this.file.name,
      size: this.file.size,
      type: this.file.type || 'application/octet-stream',
      totalChunks: this.totalChunks,
      salt: bufferToBase64Url(this.salt),
    };

    this.dc.send(JSON.stringify({ type: 'file_metadata', metadata }));

    // Stream chunk by chunk using File.slice()
    let offset = this.currentChunk * CHUNK_SIZE;

    while (this.currentChunk < this.totalChunks && !this.isCancelled) {
      // Pause check
      while (this.isPaused && !this.isCancelled) {
        await new Promise((r) => setTimeout(r, 150));
      }
      if (this.isCancelled) break;

      // Backpressure: wait for buffer to drain if above threshold
      if (this.dc.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>((resolve) => {
          if (!this.dc) return resolve();
          const onLow = () => {
            this.dc?.removeEventListener('bufferedamountlow', onLow);
            resolve();
          };
          this.dc.addEventListener('bufferedamountlow', onLow);
        });
      }

      // Read slice
      const end = Math.min(offset + CHUNK_SIZE, this.file.size);
      const sliceBlob = this.file.slice(offset, end);
      const chunkBuffer = await sliceBlob.arrayBuffer();

      // Update incremental SHA-256 with plaintext chunk (O(1) memory)
      hasher.update(chunkBuffer);

      // Encrypt chunk with AES-256-GCM
      const ciphertext = await encryptChunk(
        this.key,
        chunkBuffer,
        this.currentChunk,
        this.totalChunks,
        this.salt
      );

      // Binary packet: 4 bytes chunkIndex (uint32), 4 bytes totalChunks (uint32), then ciphertext
      const packet = new Uint8Array(8 + ciphertext.byteLength);
      const view = new DataView(packet.buffer);
      view.setUint32(0, this.currentChunk, false);
      view.setUint32(4, this.totalChunks, false);
      packet.set(new Uint8Array(ciphertext), 8);

      try {
        this.dc.send(packet.buffer);
      } catch (err) {
        console.error('DataChannel send failed:', err);
        this.updateStatus('error', 'Data channel transmission failed.');
        break;
      }

      this.bytesTransferred += chunkBuffer.byteLength;
      this.currentChunk++;
      offset = end;

      this.updateProgress();
    }

    if (this.currentChunk >= this.totalChunks && !this.isCancelled) {
      this.updateStatus('verifying');
      // Finalize incremental SHA-256 hash in O(1) memory without full file buffering
      const sha256 = hasher.digest();

      this.dc?.send(
        JSON.stringify({
          type: 'transfer_complete',
          sha256,
        })
      );
    }
  }

  private updateProgress() {
    const now = Date.now();
    const elapsedSinceLast = (now - this.lastProgressTime) / 1000;

    if (elapsedSinceLast >= 0.5 || this.currentChunk >= this.totalChunks) {
      const bytesSinceLast = this.bytesTransferred - this.lastBytesTransferred;
      this.currentSpeed = elapsedSinceLast > 0 ? bytesSinceLast / elapsedSinceLast : 0;
      this.lastBytesTransferred = this.bytesTransferred;
      this.lastProgressTime = now;
    }

    const remainingBytes = this.file.size - this.bytesTransferred;
    const etaSeconds = this.currentSpeed > 0 ? Math.round(remainingBytes / this.currentSpeed) : 0;
    const progressPercent = Math.min(100, (this.bytesTransferred / this.file.size) * 100);

    const progress: TransferProgress = {
      status: 'transferring',
      progressPercent,
      bytesTransferred: this.bytesTransferred,
      totalBytes: this.file.size,
      speedBytesPerSec: this.currentSpeed,
      etaSeconds,
      currentChunk: this.currentChunk,
      totalChunks: this.totalChunks,
      sasCode: this.sasCode,
      fileMetadata: {
        name: this.file.name,
        size: this.file.size,
        type: this.file.type,
        totalChunks: this.totalChunks,
        salt: bufferToBase64Url(this.salt),
      },
    };

    this.onProgressCb?.(progress);
  }

  private updateStatus(status: TransferStatus, error?: string) {
    this.onStatusCb?.(status, error);
    this.onProgressCb?.({
      status,
      progressPercent: this.file.size > 0 ? (this.bytesTransferred / this.file.size) * 100 : 0,
      bytesTransferred: this.bytesTransferred,
      totalBytes: this.file.size,
      speedBytesPerSec: this.currentSpeed,
      etaSeconds: 0,
      currentChunk: this.currentChunk,
      totalChunks: this.totalChunks,
      error,
      sasCode: this.sasCode,
    });
  }

  pause() {
    this.isPaused = true;
    this.dc?.send(JSON.stringify({ type: 'control', action: 'pause' }));
    this.updateStatus('paused');
  }

  resume() {
    this.isPaused = false;
    this.dc?.send(JSON.stringify({ type: 'control', action: 'resume' }));
    this.updateStatus('transferring');
  }

  cancel() {
    this.isCancelled = true;
    this.cleanup();
    this.updateStatus('idle');
  }

  private cleanup() {
    this.wakeLock.release();
    if (this.dc) {
      try { this.dc.close(); } catch (_) {}
      this.dc = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch (_) {}
      this.pc = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }
}
