export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
  salt: string; // base64url encoded
}

export type TransferStatus =
  | 'idle'
  | 'preparing'
  | 'waiting_for_receiver'
  | 'receiver_pending_approval'
  | 'approved'
  | 'connecting'
  | 'connected'
  | 'transferring'
  | 'paused'
  | 'verifying'
  | 'completed'
  | 'error'
  | 'revoked';

export interface TransferProgress {
  status: TransferStatus;
  progressPercent: number;
  bytesTransferred: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  currentChunk: number;
  totalChunks: number;
  error?: string | null;
  fileMetadata?: FileMetadata | null;
  sasCode?: string | null;
  sha256?: string | null;
}

export interface SignalingMessage {
  type:
    | 'create_session'
    | 'session_created'
    | 'join_session'
    | 'session_joined'
    | 'receiver_requested'
    | 'approve_receiver'
    | 'receiver_approved'
    | 'reject_receiver'
    | 'receiver_rejected'
    | 'revoke_session'
    | 'session_revoked'
    | 'session_locked'
    | 'signal'
    | 'peer_disconnected'
    | 'error';
  sessionId?: string;
  shortCode?: string;
  payload?: any;
  sasCode?: string | null;
  code?: string;
  message?: string;
}

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  hasResponded: boolean;
}
