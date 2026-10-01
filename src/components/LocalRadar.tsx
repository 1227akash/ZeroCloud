'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSignalingUrl } from '@/lib/webrtc';
import { formatBytes } from '@/lib/utils';
import { Wifi, Laptop, Smartphone, Send, ArrowRight, X, ShieldCheck } from 'lucide-react';

interface LocalPeer {
  id: string;
  name: string;
  device: string;
}

interface TransferInvite {
  fromPeerId: string;
  fromName: string;
  sessionId: string;
  shortCode: string;
  shareUrl: string;
  metadata?: {
    name: string;
    size: number;
    type: string;
  };
}

const FUN_NAMES = [
  'Silver Falcon', 'Neon Dolphin', 'Solar Phoenix', 'Emerald Tiger',
  'Cosmic Wolf', 'Aqua Otter', 'Crimson Hawk', 'Electric Fox',
  'Golden Panda', 'Shadow Lynx', 'Polar Bear', 'Zenith Falcon'
];

export default function LocalRadar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [peers, setPeers] = useState<LocalPeer[]>([]);
  const [myPeerName, setMyPeerName] = useState<string>('');
  const [incomingInvite, setIncomingInvite] = useState<TransferInvite | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Generate or load peer name
    let savedName = localStorage.getItem('zerocloud_peer_name');
    if (!savedName) {
      savedName = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
      localStorage.setItem('zerocloud_peer_name', savedName);
    }
    setMyPeerName(savedName);

    if (!isOpen) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Connect to signaling server for local discovery
    const url = getSignalingUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      ws.send(JSON.stringify({
        type: 'local_announce',
        name: savedName,
        device: isMobile ? 'Mobile' : 'Computer'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'local_peers_update') {
          setPeers(msg.peers || []);
        } else if (msg.type === 'local_invite_received') {
          setIncomingInvite(msg);
        }
      } catch (err) {
        console.error('Radar signal parsing error:', err);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'local_leave' }));
      }
      ws.close();
    };
  }, [isOpen]);

  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    const targetUrl = incomingInvite.shareUrl;
    setIncomingInvite(null);
    if (targetUrl) {
      router.push(targetUrl);
    } else {
      router.push(`/receive?session=${incomingInvite.sessionId}`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8">
      {/* Incoming Invite Modal */}
      {incomingInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel shadow-2xl border border-brand-500/30 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Direct Transfer Request</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">From local device: {incomingInvite.fromName}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 mb-5">
              <div className="text-sm font-medium truncate">{incomingInvite.metadata?.name || 'Encrypted File'}</div>
              {incomingInvite.metadata?.size && (
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                  {formatBytes(incomingInvite.metadata.size)} • AES-256 Encrypted
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIncomingInvite(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptInvite}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-500/25 transition-all"
              >
                <span>Accept & Download</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Radar Toggle Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all ${
            isOpen
              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/30 shadow-sm'
              : 'bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isOpen && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOpen ? 'bg-brand-500' : 'bg-zinc-400'}`}></span>
          </span>
          <Wifi className="w-3.5 h-3.5" />
          <span>{isOpen ? 'Nearby Wi-Fi Radar Active' : 'Scan for Nearby Devices on this Wi-Fi'}</span>
        </button>
      </div>

      {/* Radar Panel */}
      {isOpen && (
        <div className="mt-4 p-5 sm:p-6 rounded-2xl glass-card animate-fade-in border border-brand-500/20">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Wifi className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ZeroDrop Local Radar</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Visible as <strong className="text-brand-600 dark:text-brand-400 font-medium">{myPeerName}</strong> to devices on your Wi-Fi
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {peers.length} {peers.length === 1 ? 'peer' : 'peers'} online
            </span>
          </div>

          <div className="mt-4">
            {peers.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                <p>Searching for other ZeroCloud devices on this local network...</p>
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Open ZeroCloud on another phone or laptop connected to the same Wi-Fi to send files instantly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3 group hover:border-brand-500/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                        {peer.device === 'Mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                          {peer.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {peer.device} • Same Wi-Fi
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/send?targetPeer=${peer.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                      aria-label={`Send file to ${peer.name}`}
                    >
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
