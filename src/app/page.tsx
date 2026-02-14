'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import Lobby from '@/components/Lobby';
import GameBoard from '@/components/GameBoard';

function HomeContent() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const { initPeer, hostRoom, joinRoom, gameState, resetGame } = useGameStore();

  // Handle invite links
  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl) {
        setCode(roomFromUrl);
        setShowJoinInput(true);
    }
  }, [searchParams]);

  const handleHost = async () => {
    if (!name) return alert('Enter your nickname');
    await initPeer(name);
    hostRoom();
    setIsJoined(true);
  };

  const handleJoin = async () => {
    if (!name || !code) return alert('Enter name and room code');
    await initPeer(name);
    joinRoom(code);
    setIsJoined(true);
  };

  const handleBack = () => {
      setIsJoined(false);
      setShowJoinInput(false);
      resetGame();
  };

  if (isJoined) {
    if (gameState?.status === 'lobby') {
      return <Lobby onBack={handleBack} />;
    }
    if (gameState?.status === 'playing' || gameState?.status === 'gameover') {
      return <GameBoard />;
    }
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-bold animate-pulse">Establishing P2P Connection...</div>;
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0f1e] p-4 text-white overflow-hidden relative safe-area-bottom">
      {/* Background Polish */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />

      <h1 className="mb-2 text-8xl font-black tracking-tighter text-yellow-400 italic drop-shadow-[0_10px_30px_rgba(250,204,21,0.3)]">UNO!</h1>
      <p className="mb-12 text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">3D Multi-Player Experience</p>

      <div className="w-full max-w-md space-y-6 rounded-[32px] bg-slate-800/50 backdrop-blur-xl p-10 shadow-2xl border border-white/10 relative z-10">
        
        {!showJoinInput ? (
            <>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Your Nickname</label>
                    <input
                        type="text"
                        placeholder="Ex: Player One"
                        className="w-full rounded-2xl bg-slate-950 px-6 py-4 text-white outline-none focus:ring-2 focus:ring-yellow-400 border border-white/5 transition-all text-lg font-bold"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="pt-4 space-y-4">
                    <button
                        onClick={handleHost}
                        className="w-full rounded-2xl bg-yellow-400 py-5 font-black text-slate-950 hover:bg-yellow-300 transition-all shadow-[0_10px_20px_rgba(250,204,21,0.2)] hover:scale-[1.02] active:scale-95 text-xl uppercase italic"
                    >
                        Create Room
                    </button>
                    
                    <button
                        onClick={() => setShowJoinInput(true)}
                        className="w-full rounded-2xl bg-slate-700/50 py-5 font-black text-white hover:bg-slate-700 transition-all border border-white/5 hover:scale-[1.02] active:scale-95 text-xl uppercase italic"
                    >
                        Join Room
                    </button>
                </div>
            </>
        ) : (
            <>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nickname</label>
                        <input
                            type="text"
                            placeholder="Your name"
                            className="w-full rounded-2xl bg-slate-950 px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-400 border border-white/5 font-bold"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Room ID / Link</label>
                        <input
                            type="text"
                            placeholder="Paste code or link here"
                            className="w-full rounded-2xl bg-slate-950 px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-400 border border-white/5 font-mono"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    
                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={() => setShowJoinInput(false)}
                            className="flex-1 rounded-2xl bg-slate-900 py-5 font-black text-slate-400 hover:text-white transition-all border border-white/5 uppercase italic"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleJoin}
                            className="flex-[2] rounded-2xl bg-blue-600 py-5 font-black text-white hover:bg-blue-500 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.2)] uppercase italic"
                        >
                            Connect
                        </button>
                    </div>
                </div>
            </>
        )}
      </div>

      <div className="mt-8 mb-4 sm:mb-0 flex items-center gap-6 text-slate-600 font-bold text-xs uppercase tracking-widest relative z-10">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Global P2P</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> 3D Graphics</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> 20 Players</div>
      </div>
    </main>
  );
}

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HomeContent />
        </Suspense>
    );
}
