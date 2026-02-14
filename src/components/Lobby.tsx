'use client';

import { useGameStore } from '@/store/gameStore';
import { Users, Copy, Play } from 'lucide-react';

interface LobbyProps {
  onBack: () => void;
}

export default function Lobby({ onBack }: LobbyProps) {
  const { gameState, roomCode, isHost, startGame } = useGameStore();

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            alert('Invite link copied to clipboard!');
        }).catch(() => {
            fallbackCopyTextToClipboard(url);
        });
    } else {
        fallbackCopyTextToClipboard(url);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  // avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      alert('Invite link copied to clipboard!');
    } catch (err) {
      alert('Unable to copy. Please manually share the room code: ' + roomCode);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex h-[100dvh] flex-col items-center bg-[#0a0f1e] p-4 sm:p-8 text-white overflow-hidden relative safe-area-bottom">
      <div className="absolute top-0 left-0 p-4 sm:p-8 z-50">
          <button 
            onClick={onBack}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-black uppercase tracking-widest border border-white/5 shadow-lg"
          >
              ← Back
          </button>
      </div>

      <div className="w-full max-w-2xl mt-16 sm:mt-12 flex flex-col h-full overflow-hidden">
        <header className="mb-6 sm:mb-12 text-center flex-shrink-0">
          <h1 className="text-4xl sm:text-6xl font-black text-yellow-400 italic mb-4 drop-shadow-xl">LOBBY</h1>
          
          <div className="bg-slate-800/50 backdrop-blur-md p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/10 shadow-2xl inline-flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
                <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">Invite Link</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tighter">{roomCode}</span>
            </div>
            <button 
                onClick={copyInviteLink} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase transition-all active:scale-95 shadow-lg"
            >
              <Copy size={16} /> Copy Invite Link
            </button>
          </div>
        </header>

        <section className="bg-slate-800/40 backdrop-blur-md rounded-[24px] sm:rounded-[32px] border border-white/10 overflow-hidden shadow-2xl flex flex-col flex-1 min-h-0 mb-4">
          <div className="p-4 sm:p-6 border-b border-white/5 bg-white/5 flex items-center gap-3 flex-shrink-0">
            <Users size={20} className="text-blue-400" />
            <h2 className="font-black uppercase tracking-widest text-base sm:text-lg">Players ({gameState?.players.length}/20)</h2>
          </div>
          
          <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 overflow-y-auto flex-1 no-scrollbar pb-24 content-start">
            {gameState?.players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 h-10 rounded-lg border border-white/5 shadow-inner">
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] flex-shrink-0", p.isHost ? 'text-yellow-400 bg-yellow-400' : 'text-green-400 bg-green-400')} />
                <span className="font-black uppercase text-[10px] leading-none tracking-tight truncate flex-1">{p.name}</span>
                {p.isHost && <span className="text-yellow-400 text-[10px]">★</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <div className="p-4 sm:p-8 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 absolute bottom-0 left-0 right-0 z-20">
              <button
                onClick={startGame}
                disabled={(gameState?.players.length || 0) < 2}
                className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:grayscale py-4 sm:py-6 rounded-xl sm:rounded-2xl font-black text-xl sm:text-2xl uppercase italic transition-all shadow-xl active:scale-[0.98]"
              >
                <Play fill="currentColor" size={24} /> START MISSION
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
