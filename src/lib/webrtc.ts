// WebRTC Connection, DataChannel Streaming, and Backpressure Management for ZeroCloud
import { encryptChunk, decryptChunk, base64UrlToBuffer, bufferToBase64Url } from './crypto';
import { FileMetadata, TransferProgress, TransferStatus, SignalingMessage } from './types';

export const CHUNK_SIZE = 64 * 1024; // 64 KB chunks
export const BUFFER_THRESHOLD = 1024 * 1024; // 1 MB backpressure threshold

export function getRtcConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [];

  const stunEnv = process.env.NEXT_PUBLIC_STUN_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302';
  const stunUrls = stunEnv.split(',').map((s) => s.trim()).filter(Boolean);
  if (stunUrls.length > 0) {
    iceServers.push({ urls: stunUrls });
  }

  const turnEnv = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (turnEnv) {
    const turnUrls = turnEnv.split(',').map((s) => s.trim()).filter(Boolean);
    const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const credential = process.env.NEXT_PUBLIC_TURN_PASSWORD;
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username,
        credential,
      });
    }
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}

export function getSignalingUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return 'ws://localhost:3000/ws';
}

export class WakeLockManager {
  private sentinel: any = null;

  async request() {
    try {
      if ('wakeLock' in navigator) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock request error:', err);
    }
  }

  release() {
    try {
      if (this.sentinel) {
        this.sentinel.release();
        this.sentinel = null;
      }
    } catch (err) {
      console.warn('Wake Lock release error:', err);
    }
  }
}
