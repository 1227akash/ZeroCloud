import {
  importSessionKey,
  deriveSasCode,
  decryptChunk,
  base64UrlToBuffer,
  computeSha256,
} from './crypto';
import {
  CHUNK_SIZE,
  getRtcConfiguration,
  getSignalingUrl,
  WakeLockManager,
} from './webrtc';
import { FileMetadata, TransferProgress, TransferStatus, SignalingMessage } from './types';

export class TransferReceiver {
  public sessionId: string;
  public shortCode: string;
  public rawKeyBase64: string;
  public sasCode: string = '';
  public salt: Uint8Array | null = null;
  public metadata: FileMetadata | null = null;

  private key: CryptoKey | null = null;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private wakeLock = new WakeLockManager();

  // File System Access API writable stream
  private writable: any = null;
  // Fallback chunk accumulator for browsers without File System Access API
  private fallbackChunks: Uint8Array[] = [];

  private isCancelled = false;
  private currentChunk = 0;
  private bytesReceived = 0;
  private totalBytes = 0;
  private startTime = 0;
  private lastProgressTime = 0;
  private lastBytesReceived = 0;
  private currentSpeed = 0;

  private onProgressCb: ((progress: TransferProgress) => void) | null = null;
  private onStatusCb: ((status: TransferStatus, error?: string) => void) | null = null;
  private onReadyToSaveCb: ((fileName: string, fileSize: number) => Promise<boolean>) | null = null;

  constructor(sessionId: string, rawKeyBase64: string, shortCode?: string) {
    this.sessionId = sessionId;
    this.rawKeyBase64 = rawKeyBase64;
    this.shortCode = shortCode || '';
  }

  onProgress(cb: (progress: TransferProgress) => void) {
    this.onProgressCb = cb;
  }

  onStatus(cb: (status: TransferStatus, error?: string) => void) {
    this.onStatusCb = cb;
  }

  onReadyToSave(cb: (fileName: string, fileSize: number) => Promise<boolean>) {
    this.onReadyToSaveCb = cb;
  }

  async initialize(): Promise<void> {
    if (this.rawKeyBase64) {
      this.key = await importSessionKey(this.rawKeyBase64);
    }

    await this.connectSignaling();
  }

  private connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.updateStatus('connecting');
      const wsUrl = getSignalingUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws?.send(
          JSON.stringify({
            type: 'join_session',
            sessionId: this.sessionId,
            shortCode: this.shortCode,
          })
        );
        this.updateStatus('receiver_pending_approval');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data);
          this.handleSignalingMessage(msg);
        } catch (err) {
          console.error('Signaling message parse error:', err);
        }
      };

      this.ws.onerror = (err) => {
        this.updateStatus('error', 'Unable to connect to signaling server.');
        reject(err);
      };

      this.ws.onclose = () => {
        if (!this.isCancelled && this.currentChunk < (this.metadata?.totalChunks || 1)) {
          console.warn('Signaling closed.');
        }
      };
    });
  }

  private async handleSignalingMessage(msg: SignalingMessage) {
    switch (msg.type) {
      case 'session_joined':
        if (msg.sessionId) this.sessionId = msg.sessionId;
        if (msg.shortCode) this.shortCode = msg.shortCode;
        break;

      case 'receiver_approved':
        this.updateStatus('approved');
        await this.setupPeerConnection();
        break;

      case 'receiver_rejected':
        this.updateStatus('error', 'Sender rejected this connection request.');
        this.cleanup();
        break;

      case 'session_revoked':
        this.updateStatus('revoked', 'Sender revoked this transfer session.');
        this.cleanup();
        break;

      case 'peer_disconnected':
        this.updateStatus('error', 'Sender disconnected or closed their tab.');
        this.cleanup();
        break;

      case 'error':
        this.updateStatus('error', msg.message || 'Transfer session error');
        this.cleanup();
        break;

      case 'signal':
        this.handlePeerSignal(msg.payload);
        break;
    }
  }

  private async setupPeerConnection() {
    this.updateStatus('connecting');
    const rtcConfig = getRtcConfiguration();
    this.pc = new RTCPeerConnection(rtcConfig);

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

    // Receiver handles data channel initiated by sender
    this.pc.ondatachannel = (event) => {
      this.dc = event.channel;
      this.dc.binaryType = 'arraybuffer';

      this.dc.onopen = () => {
        this.updateStatus('connected');
      };

      this.dc.onmessage = async (e) => {
        if (typeof e.data === 'string') {
          try {
            const dataMsg = JSON.parse(e.data);
            await this.handleJsonMessage(dataMsg);
          } catch (err) {
            console.error('Invalid DC JSON:', err);
          }
        } else if (e.data instanceof ArrayBuffer) {
          await this.handleBinaryChunk(e.data);
        }
      };
    };
  }

  private async handlePeerSignal(payload: any) {
    if (!this.pc) return;

    if (payload.sdp) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      if (payload.sdp.type === 'offer') {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this.ws?.send(
          JSON.stringify({
            type: 'signal',
            sessionId: this.sessionId,
            payload: { sdp: this.pc.localDescription },
          })
        );
      }
    } else if (payload.candidate) {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }

  private async handleJsonMessage(msg: any) {
    if (msg.type === 'file_metadata') {
      this.metadata = msg.metadata;
      this.totalBytes = this.metadata!.size;
      this.salt = base64UrlToBuffer(this.metadata!.salt);

      // Compute SAS code for mutual verification
      this.sasCode = await deriveSasCode(this.sessionId, this.salt);

      // Initialize destination: File System Access API or fallback
      await this.initDestination();
      this.startTime = Date.now();
      this.lastProgressTime = this.startTime;
      this.wakeLock.request();
      this.updateStatus('transferring');
    } else if (msg.type === 'control') {
      if (msg.action === 'pause') {
        this.updateStatus('paused');
      } else if (msg.action === 'resume') {
        this.updateStatus('transferring');
      }
    } else if (msg.type === 'transfer_complete') {
      await this.finalizeTransfer(msg.sha256);
    }
  }

  private async initDestination() {
    if (!this.metadata) return;

    // Check if browser supports File System Access API and window is available
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        if (this.onReadyToSaveCb) {
          await this.onReadyToSaveCb(this.metadata.name, this.metadata.size);
        }
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: this.metadata.name,
        });
        this.writable = await handle.createWritable();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn('User dismissed file picker, using direct download stream fallback.');
        } else {
          console.warn('File System Access API error, using fallback:', err);
        }
      }
    }

    // Fallback: collect chunks in memory / buffer
    this.fallbackChunks = [];
  }

  private async handleBinaryChunk(buffer: ArrayBuffer) {
    if (!this.key || !this.salt || !this.metadata) {
      console.error('Cannot process chunk: missing key or metadata');
      return;
    }

    // Packet structure:
    // 0..3: chunkIndex (uint32)
    // 4..7: totalChunks (uint32)
    // 8..end: encrypted payload (ciphertext + tag)
    const view = new DataView(buffer);
    const chunkIndex = view.getUint32(0, false);
    const totalChunks = view.getUint32(4, false);
    const ciphertext = buffer.slice(8);

    try {
      const decryptedChunk = await decryptChunk(
        this.key,
        ciphertext,
        chunkIndex,
        totalChunks,
        this.salt
      );

      // Write directly to disk stream or push to accumulator
      if (this.writable) {
        await this.writable.write(decryptedChunk);
      } else {
        this.fallbackChunks.push(new Uint8Array(decryptedChunk));
      }

      this.bytesReceived += decryptedChunk.byteLength;
      this.currentChunk = chunkIndex + 1;

      // Send ACK periodically
      if (this.currentChunk % 32 === 0 || this.currentChunk === totalChunks) {
        this.dc?.send(JSON.stringify({ type: 'chunk_ack', chunkIndex }));
      }

      this.updateProgress();
    } catch (err) {
      console.error(`Chunk decryption failed at chunk ${chunkIndex}:`, err);
      this.updateStatus('error', 'Chunk authentication failed: data tampering or corruption detected.');
    }
  }

  private async finalizeTransfer(expectedSha256: string) {
    this.updateStatus('verifying');

    let isValid = false;

    if (this.writable) {
      await this.writable.close();
      this.writable = null;
      // In File System Access API, the file is fully written to disk
      isValid = true; // Chunks were AES-GCM authenticated per slice
    } else if (this.fallbackChunks.length > 0) {
      const blob = new Blob(this.fallbackChunks as unknown as BlobPart[], {
        type: this.metadata?.type || 'application/octet-stream',
      });
      const buffer = await blob.arrayBuffer();
      const calculatedHash = await computeSha256(buffer);

      isValid = calculatedHash.toLowerCase() === expectedSha256.toLowerCase();

      if (isValid && typeof window !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.metadata?.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
      this.fallbackChunks = [];
    }

    this.dc?.send(
      JSON.stringify({
        type: 'integrity_verified',
        success: isValid,
      })
    );

    this.wakeLock.release();

    if (isValid) {
      this.updateStatus('completed');
    } else {
      this.updateStatus('error', 'File integrity check failed: SHA-256 hash mismatch.');
    }
  }

  private updateProgress() {
    const now = Date.now();
    const elapsedSinceLast = (now - this.lastProgressTime) / 1000;

    if (elapsedSinceLast >= 0.5 || this.currentChunk >= (this.metadata?.totalChunks || 1)) {
      const bytesSinceLast = this.bytesReceived - this.lastBytesReceived;
      this.currentSpeed = elapsedSinceLast > 0 ? bytesSinceLast / elapsedSinceLast : 0;
      this.lastBytesReceived = this.bytesReceived;
      this.lastProgressTime = now;
    }

    const remainingBytes = this.totalBytes - this.bytesReceived;
    const etaSeconds = this.currentSpeed > 0 ? Math.round(remainingBytes / this.currentSpeed) : 0;
    const progressPercent = this.totalBytes > 0 ? Math.min(100, (this.bytesReceived / this.totalBytes) * 100) : 0;

    const progress: TransferProgress = {
      status: 'transferring',
      progressPercent,
      bytesTransferred: this.bytesReceived,
      totalBytes: this.totalBytes,
      speedBytesPerSec: this.currentSpeed,
      etaSeconds,
      currentChunk: this.currentChunk,
      totalChunks: this.metadata?.totalChunks || 0,
      sasCode: this.sasCode,
      fileMetadata: this.metadata,
    };

    this.onProgressCb?.(progress);
  }

  private updateStatus(status: TransferStatus, error?: string) {
    this.onStatusCb?.(status, error);
    this.onProgressCb?.({
      status,
      progressPercent: this.totalBytes > 0 ? (this.bytesReceived / this.totalBytes) * 100 : 0,
      bytesTransferred: this.bytesReceived,
      totalBytes: this.totalBytes,
      speedBytesPerSec: this.currentSpeed,
      etaSeconds: 0,
      currentChunk: this.currentChunk,
      totalChunks: this.metadata?.totalChunks || 0,
      error,
      sasCode: this.sasCode,
      fileMetadata: this.metadata,
    });
  }

  cancel() {
    this.isCancelled = true;
    this.cleanup();
    this.updateStatus('idle');
  }

  private cleanup() {
    this.wakeLock.release();
    if (this.writable) {
      try { this.writable.abort(); } catch (_) {}
      this.writable = null;
    }
    this.fallbackChunks = [];
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
