
'use client';

import { useGameStore } from '@/store/gameStore';
import Card from './Card';
import { useState, useEffect, useRef } from 'react';
import { CardColor, isValidMove } from '@/lib/uno';
import { AlertCircle, ArrowRightCircle, ArrowLeftCircle, User, Crown, Bot, Ghost, Zap, Skull, Smile, Gamepad2, Rocket, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/sounds';

// Helper to get a consistent character for a player ID
const getCharacter = (id: string) => {
  const chars = [Bot, Ghost, Zap, Skull, Smile, Gamepad2, Rocket, Star];
  const charIndex = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % chars.length;
  const colors = [
    'from-red-400 to-red-600',
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-yellow-400 to-yellow-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600'
  ];
  const colorIndex = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return { Icon: chars[charIndex], gradient: colors[colorIndex] };
};

export default function GameBoard() {
  const { gameState, myId, playCard, drawCard, lastAction, callUno, challengeUno } = useGameStore();
  const [showColorPicker, setShowColorPicker] = useState<string[] | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [flyingCard, setFlyingCard] = useState<{fromX: number, fromY: number, card: any} | null>(null);
  const [boomedPlayers, setBoomedPlayers] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const opponentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const me = gameState?.players.find(p => p.id === myId);
  const isMyTurn = gameState?.players[gameState?.currentPlayerIndex || 0]?.id === myId;

  // Sound: Turn Notification
  useEffect(() => {
    if (isMyTurn && gameState?.status === 'playing') {
        playSound('turn');
    }
  }, [isMyTurn, gameState?.status, gameState?.currentPlayerIndex]);

  useEffect(() => {
    // Handle BOOM animation when a player is eliminated
    gameState?.players.forEach(p => {
        if (p.isEliminated && !boomedPlayers.has(p.id)) {
            setBoomedPlayers(prev => new Set(prev).add(p.id));
            playSound('boom');
            
            const el = opponentRefs.current[p.id];
            if (el) {
                const rect = el.getBoundingClientRect();
                confetti({
                    particleCount: 150,
                    startVelocity: 45,
                    spread: 360,
                    origin: {
                        x: (rect.left + rect.width / 2) / window.innerWidth,
                        y: (rect.top + rect.height / 2) / window.innerHeight
                    },
                    colors: ['#ff0000', '#ffaa00', '#ffffff', '#000000']
                });
            }
        }
    });
  }, [gameState?.players, boomedPlayers]);

  useEffect(() => {
    // Clear selection if turn changes
    setSelectedCards([]);
  }, [gameState?.currentPlayerIndex]);

  useEffect(() => {
    if (gameState?.winner && typeof window !== 'undefined') {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff5555', '#5555ff', '#55aa55', '#ffaa00']
      });
    }
  }, [gameState?.winner]);

  useEffect(() => {
    if (lastAction && lastAction.type === 'play' && lastAction.card) {
       playSound('throw');
       const el = opponentRefs.current[lastAction.playerId];
       if (el) {
         const rect = el.getBoundingClientRect();
         setFlyingCard({
            fromX: rect.left + rect.width / 2,
            fromY: rect.top + rect.height / 2,
            card: lastAction.card
         });
         setTimeout(() => setFlyingCard(null), 600);
       }
    }
  }, [lastAction]);

  useEffect(() => {
    if (lastAction && lastAction.type === 'draw') {
       playSound('draw');
    }
  }, [lastAction]);

  if (!gameState) return null;

  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  
  const otherPlayers = gameState.players.filter(p => p.id !== myId);
  const totalOthers = otherPlayers.length;
  
  const handleCardClick = (cardId: string) => {
    if (!isMyTurn || !me) return;

    const card = me.hand.find(c => c.id === cardId);
    if (!card) return;

    const playable = isValidMove(card, topCard, gameState.activeColor, gameState.drawStack);

    // Smart Auto-Throw Logic:
    // If no cards are selected yet and this is the ONLY card of its value in our hand,
    // just throw it immediately (unless it's a wild which needs a color picker).
    if (selectedCards.length === 0 && playable) {
        const sameValueCards = me.hand.filter(c => c.value === card.value);
        if (sameValueCards.length === 1) {
            if (card.color === 'wild') {
                setShowColorPicker([cardId]);
            } else {
                playCard([cardId]);
            }
            return;
        }
    }

    // Toggle selection for multi-throw if we have duplicates or already started selecting
    setSelectedCards(prev => {
        if (prev.includes(cardId)) {
            return prev.filter(id => id !== cardId);
        }

        // Rule: Only allow selecting multiple of the SAME VALUE
        if (prev.length > 0) {
            const firstCard = me.hand.find(c => c.id === prev[0]);
            if (firstCard && card.value !== firstCard.value) {
                return [cardId];
            }
        }

        return [...prev, cardId];
    });
  };

  const throwSelectedCards = () => {
    if (selectedCards.length === 0) return;
    
    // Validate the FIRST card in selection against the pile
    const firstCard = me?.hand.find(c => c.id === selectedCards[0]);
    if (!firstCard || !isValidMove(firstCard, topCard, gameState.activeColor, gameState.drawStack)) {
        // First card must be valid
        return;
    }

    // Check if we need to pick a color (if the LAST card is wild)
    const lastCard = me?.hand.find(c => c.id === selectedCards[selectedCards.length - 1]);
    if (lastCard?.color === 'wild') {
        setShowColorPicker(selectedCards);
    } else {
        playCard(selectedCards);
        setSelectedCards([]);
    }
  };

  const selectColor = (color: CardColor) => {
    if (showColorPicker) {
      playCard(showColorPicker, color);
      setShowColorPicker(null);
      setSelectedCards([]);
    }
  };

  if (gameState.status === 'gameover') {
    const winner = gameState.players.find(p => p.id === gameState.winner);
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0f172a] text-white p-4 z-50 relative overflow-hidden">
        <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="text-center bg-slate-800 p-12 rounded-[40px] border-8 border-yellow-400 shadow-[0_0_100px_rgba(250,204,21,0.3)]"
        >
            <Crown size={80} className="mx-auto text-yellow-400 mb-4" />
            <h1 className="text-7xl font-black text-white mb-4 italic uppercase">Victory!</h1>
            <p className="text-3xl font-bold mb-8 text-yellow-400">{winner?.name} wins the game</p>
            <div className="flex gap-4">
                {useGameStore.getState().isHost && (
                    <button 
                        onClick={() => useGameStore.getState().playAgain()} 
                        className="bg-green-600 text-white px-12 py-4 rounded-full font-black text-xl hover:scale-110 transition-transform shadow-xl"
                    >
                        PLAY AGAIN
                    </button>
                )}
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-slate-700 text-white px-8 py-4 rounded-full font-bold text-xl hover:bg-slate-600"
                >
                    EXIT ROOM
                </button>
            </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#0a0f1e] overflow-hidden relative perspective-[1500px] font-sans safe-area-bottom">
      
      {/* Dynamic Background Spotlight */}
      <div 
        className="absolute inset-0 transition-all duration-1000 opacity-20 pointer-events-none"
        style={{
            background: `radial-gradient(circle at 50% 50%, ${
                gameState.activeColor === 'red' ? '#ff5555' :
                gameState.activeColor === 'blue' ? '#5555ff' :
                gameState.activeColor === 'green' ? '#55aa55' :
                gameState.activeColor === 'yellow' ? '#ffaa00' : '#ffffff'
            } 0%, transparent 70%)`
        }}
      />

      {/* 3D Table Surface (Auto-scaling container) */}
      <div className="absolute inset-0 flex items-center justify-center transform-style-3d rotate-x-[25deg] scale-[0.55] xs:scale-[0.65] sm:scale-[0.75] md:scale-[0.8] lg:scale-[0.9] translate-y-[-15%] sm:translate-y-[-10%]">
        
        {/* The Felt Table - Further reduced for maximum visibility */}
        <div className="w-[850px] h-[500px] bg-[#1b4332] rounded-[150px] relative border-[15px] border-[#2b1b17] shadow-[0_50px_80px_rgba(0,0,0,0.9)] flex items-center justify-center">
            
            {/* Table Grain Effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none rounded-[135px] overflow-hidden">
                <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
            </div>

            {/* Turn Spotlight on Table */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 {otherPlayers.map((player, index) => {
                     const isActive = gameState.players[gameState.currentPlayerIndex].id === player.id;
                     const angleStep = 180 / (totalOthers + 1);
                     const angle = 180 + angleStep * (index + 1);
                     
                     return isActive ? (
                         <motion.div
                            key="spotlight"
                            className="w-[500px] h-[120px] bg-gradient-to-t from-yellow-400/30 to-transparent absolute bottom-1/2 origin-bottom rounded-t-full blur-xl"
                            style={{ rotate: `${angle + 90}deg` }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                         />
                     ) : null;
                 })}
                 {isMyTurn && (
                     <motion.div
                        className="w-[500px] h-[150px] bg-gradient-to-b from-yellow-400/20 to-transparent absolute top-1/2 origin-top rounded-b-full blur-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                     />
                 )}
            </div>

            {/* Active Color Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-24 z-30">
                <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                        "px-4 py-1.5 rounded-full border-2 border-white/50 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl text-white backdrop-blur-md",
                        gameState.activeColor === 'red' ? "bg-red-600" :
                        gameState.activeColor === 'blue' ? "bg-blue-600" :
                        gameState.activeColor === 'green' ? "bg-green-600" :
                        gameState.activeColor === 'yellow' ? "bg-yellow-500" : "bg-slate-700"
                    )}
                >
                    {gameState.activeColor || 'None'}
                </motion.div>
            </div>

            {/* Deck & Discard Area */}
            <div className="flex gap-10 items-center transform translate-z-20 relative z-20">
                {/* Draw Pile */}
                <motion.div 
                    whileHover={{ scale: 1.05, y: -10 }}
                    onClick={() => isMyTurn && drawCard()}
                    className={cn(
                        "w-24 h-36 bg-[#222] rounded-xl border-[4px] border-[#444] cursor-pointer shadow-2xl relative transition-all duration-500",
                        isMyTurn ? 'ring-[6px] ring-yellow-400 animate-pulse scale-105' : 'opacity-80'
                    )}
                >
                    <div className="absolute inset-1 rounded-lg border-2 border-dashed border-[#555] flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-[#444] -rotate-45 select-none italic">UNO</span>
                    </div>
                </motion.div>

                {/* Discard Pile */}
                <div className="w-24 h-36 relative">
                   <div className="absolute inset-0 border-2 border-white/10 rounded-xl" />
                   <AnimatePresence mode="popLayout">
                       {gameState.discardPile.slice(-5).map((card, i) => {
                           // Use a stable rotation based on card ID to avoid hydration mismatch
                           const stableRotation = card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 20 - 10;
                           return (
                               <motion.div 
                                 key={card.id}
                                 initial={{ scale: 2, opacity: 0, y: -300, rotate: 90 }}
                                 animate={{ scale: 1, opacity: 1, y: 0, rotate: (i - 2) * 8 + stableRotation }}
                                 className="absolute inset-0 shadow-2xl"
                                 style={{ zIndex: i }}
                               >
                                   <Card card={card} size="md" />
                               </motion.div>
                           );
                       })}
                   </AnimatePresence>
                </div>
            </div>

            {/* Direction Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none">
                <motion.div 
                    animate={{ rotate: gameState.direction === 1 ? 360 : -360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="w-full h-full border-[6px] border-dashed border-white/5 rounded-full flex items-center justify-between px-4"
                >
                    {gameState.direction === 1 ? <ArrowRightCircle className="text-white/10 w-8 h-8" /> : <ArrowLeftCircle className="text-white/10 w-8 h-8" />}
                    {gameState.direction === 1 ? <ArrowRightCircle className="text-white/10 w-8 h-8" /> : <ArrowLeftCircle className="text-white/10 w-8 h-8" />}
                </motion.div>
            </div>
            
             {/* Stacking Alert */}
             <AnimatePresence>
                 {gameState.drawStack > 0 && (
                     <motion.div 
                        initial={{ scale: 0, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0 }}
                        className="absolute bottom-12 bg-red-600 text-white px-5 py-2.5 rounded-[12px] font-black text-lg shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 border-white flex items-center gap-3 z-50"
                     >
                        <AlertCircle size={20} /> STACK: +{gameState.drawStack}
                     </motion.div>
                 )}
             </AnimatePresence>
        </div>

        {/* Opponents Arc - Radius reduced significantly for visibility */}
        {otherPlayers.map((player, index) => {
            const angleStep = 180 / (totalOthers + 1);
            const angle = 180 + angleStep * (index + 1);
            const radius = 380;
            const x = radius * Math.cos((angle * Math.PI) / 180);
            const y = radius * Math.sin((angle * Math.PI) / 180);
            
            const isActive = gameState.players[gameState.currentPlayerIndex].id === player.id;
            const char = getCharacter(player.id);
            const isActing = lastAction?.playerId === player.id && lastAction?.type === 'play';

            return (
                <div
                    key={player.id}
                    ref={(el) => { opponentRefs.current[player.id] = el; }}
                    className={cn(
                        "absolute w-40 h-40 flex flex-col items-center justify-center transition-all duration-700",
                        player.isEliminated && "grayscale-[0.8] opacity-60"
                    )}
                    style={{
                        transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                        zIndex: 100
                    }}
                >
                    {/* Visual Card Fan (Behind Character) */}
                    {!player.isEliminated && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {Array.from({ length: Math.min(player.hand.length, 10) }).map((_, i) => {
                                const cardRotation = (i - (Math.min(player.hand.length, 10) - 1) / 2) * 15;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1, rotate: cardRotation, y: -20 }}
                                        className="absolute w-8 h-12 bg-[#222] border-2 border-white/20 rounded-md shadow-lg origin-bottom"
                                        style={{ zIndex: i }}
                                    >
                                        <div className="absolute inset-1 rounded-sm border border-white/10 flex items-center justify-center">
                                            <span className="text-[6px] font-black text-white/20 rotate-[-45deg]">UNO</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {player.hand.length > 10 && (
                                <div className="absolute -top-8 text-white text-[10px] font-black bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                                    +{player.hand.length - 10} more
                                </div>
                            )}
                        </div>
                    )}

                    <motion.div 
                        animate={
                            isActing ? { y: 50, scale: 0.9 } : 
                            isActive ? { scale: [1, 1.15, 1], y: [0, -10, 0] } : {}
                        }
                        transition={isActing ? { type: "spring", stiffness: 300 } : { repeat: Infinity, duration: 2 }}
                        className={cn(
                            "w-24 h-24 rounded-full flex items-center justify-center relative shadow-[0_15px_40px_rgba(0,0,0,0.6)] border-[6px] border-white/30",
                            `bg-gradient-to-br ${char.gradient}`,
                            "z-10",
                            player.isEliminated && "brightness-50"
                        )}
                    >
                        {/* BOOM Icon for eliminated players */}
                        {player.isEliminated && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <Skull size={40} className="text-white animate-pulse" />
                            </div>
                        )}

                        {/* 3D Shine Effect */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                        
                        {/* Turn Ring */}
                        {isActive && !player.isEliminated && (
                            <motion.div 
                                className="absolute -inset-4 border-[6px] border-yellow-400 rounded-full z-0"
                                animate={{ opacity: [1, 0, 1], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                        )}

                        <char.Icon size={48} className="text-white drop-shadow-lg relative z-10" />
                        
                        {/* LARGE Card Count Badge */}
                        {!player.isEliminated && (
                            <div className={cn(
                                "absolute -top-3 -right-3 text-white text-lg font-black w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl z-20 transition-colors",
                                player.hand.length >= 15 ? "bg-orange-600 animate-pulse" : 
                                player.hand.length >= 18 ? "bg-red-700 animate-bounce" : "bg-red-600"
                            )}>
                                {player.hand.length}
                            </div>
                        )}
                        
                        {/* 21 Card Limit Indicator */}
                        {!player.isEliminated && (
                            <div className="absolute -bottom-8 bg-black/40 px-2 py-0.5 rounded text-[8px] text-white/60">
                                {player.hand.length}/21
                            </div>
                        )}

                        {/* CHALLENGE Button (EXTREMELY VISIBLE) */}
                        {player.hand.length === 1 && !player.hasCalledUno && !player.isEliminated && (
                            <motion.button
                                initial={{ scale: 0, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                onClick={(e) => { e.stopPropagation(); challengeUno(player.id); }}
                                className="absolute -top-16 bg-gradient-to-b from-red-500 to-red-700 text-white text-xs font-black px-4 py-2 rounded-xl border-4 border-white shadow-[0_0_30px_rgba(220,38,38,0.8)] z-[200] animate-pulse"
                            >
                                CHALLENGE!
                            </motion.button>
                        )}

                        {/* UNO Called Badge */}
                        {player.hasCalledUno && !player.isEliminated && (
                            <motion.div 
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: -15 }}
                                className="absolute -bottom-4 -left-4 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-lg border-2 border-black z-30 shadow-lg"
                            >
                                UNO!
                            </motion.div>
                        )}
                    </motion.div>
                    
                    <div className={cn(
                        "mt-4 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-tighter whitespace-nowrap shadow-xl transition-all duration-500 flex flex-col items-center border-2 border-white/10 backdrop-blur-md",
                        isActive && !player.isEliminated ? "bg-yellow-400 text-black scale-110 border-yellow-200" : "bg-black/60 text-slate-300",
                        player.isEliminated && "bg-red-900/40 border-red-500/20 text-red-400"
                    )}>
                        <span>{player.name} {player.isEliminated && "(BOOMED)"}</span>
                        {isActive && !player.isEliminated && (
                            <motion.span 
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="text-[10px] mt-0.5 font-bold"
                            >
                                THINKING...
                            </motion.span>
                        )}
                    </div>
                </div>
            );
        })}

      </div>

      {/* Flying Card Animation Layer */}
      <AnimatePresence>
        {flyingCard && (
            <motion.div
                initial={{ x: flyingCard.fromX, y: flyingCard.fromY, scale: 0.5, opacity: 1, rotate: 0 }}
                animate={{ 
                    x: window.innerWidth / 2 - 48,
                    y: window.innerHeight / 2 - 72,
                    scale: 1, 
                    rotate: 720 
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="fixed top-0 left-0 z-[1000] pointer-events-none"
            >
                <Card card={flyingCard.card} size="md" />
            </motion.div>
        )}
      </AnimatePresence>

      {/* My Hand (Fixed at bottom) */}
      <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 h-56 sm:h-64 lg:h-80 flex items-end justify-center pb-8 sm:pb-12 perspective-[1000px] z-[500] pointer-events-none">
          <div className="relative flex pointer-events-auto items-end hover:items-start transition-all duration-500">
              {me?.hand.map((card, i) => {
                  const totalCards = me.hand.length;
                  const isLargeHand = totalCards > 10;
                  
                  // Dynamic spacing calculation
                  // Base overlap increases as hand size grows
                  const overlap = isMobile 
                    ? Math.min(45, 20 + (totalCards * 1.5)) 
                    : Math.min(60, 30 + (totalCards * 1));

                  const rotation = (i - (totalCards - 1) / 2) * (Math.min(50 / totalCards, 6));
                  const translateY = Math.abs(i - (totalCards - 1) / 2) * (Math.min(20 / totalCards, 4));
                  const isSelected = selectedCards.includes(card.id);
                  const canBeFirstCard = isMyTurn && isValidMove(card, topCard, gameState.activeColor, gameState.drawStack);
                  
                  // Card is playable if it's already selected, OR if it's the first card being picked, OR if it matches value of current selection
                  let isPlayable = canBeFirstCard;
                  if (selectedCards.length > 0) {
                      const firstSelected = me.hand.find(c => c.id === selectedCards[0]);
                      isPlayable = card.value === firstSelected?.value;
                  }

                  return (
                      <motion.div
                        key={card.id}
                        initial={{ y: 300, opacity: 0 }}
                        animate={{ 
                            y: isSelected ? -60 : translateY, 
                            rotate: isSelected ? 0 : rotation, 
                            opacity: 1,
                            scale: isSelected ? 1.2 : 1,
                            marginLeft: i === 0 ? 0 : -overlap
                        }}
                        whileHover={{ y: -100, rotate: 0, scale: 1.5, zIndex: 1000 }}
                        whileTap={{ scale: 1.4 }}
                        className={cn(
                            "origin-bottom cursor-pointer transition-all duration-300",
                            isSelected && "z-[1001]"
                        )}
                        style={{ zIndex: i }}
                        onClick={() => handleCardClick(card.id)}
                      >
                          <Card 
                            card={card} 
                            isPlayable={isPlayable || isSelected}
                            disabled={!isMyTurn}
                            size={isMobile ? 'sm' : 'md'}
                          />
                      </motion.div>
                  );
              })}
          </div>
      </div>

      {/* THROW Button */}
      {isMyTurn && selectedCards.length > 0 && (
          <div className="absolute bottom-64 left-1/2 -translate-x-1/2 z-[1000]">
              <motion.button
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                                  onClick={throwSelectedCards}
                                className={cn(
                                    "px-12 py-5 rounded-full font-black text-2xl uppercase italic shadow-2xl border-4 transition-all",
                                    (me && selectedCards.length > 0 && isValidMove(me.hand.find(c => c.id === selectedCards[0])!, topCard, gameState.activeColor, gameState.drawStack))
                                    ? "bg-green-500 text-white border-white shadow-green-500/40"
                                    : "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-50"
                                )}
                
              >
                  Throw {selectedCards.length} Card{selectedCards.length > 1 ? 's' : ''}
              </motion.button>
          </div>
      )}
        
      {/* Universal Turn Indicator Overlay */}
      <AnimatePresence>
        {gameState.status === 'playing' && (
            <motion.div 
                key={gameState.currentPlayerIndex}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="absolute top-20 sm:top-40 left-0 right-0 flex justify-center pointer-events-none z-[600]"
            >
                <div className={cn(
                    "px-10 py-3 rounded-full font-black text-xl uppercase italic shadow-2xl border-4 border-black animate-pulse backdrop-blur-md transition-colors duration-500",
                    isMyTurn ? "bg-yellow-400 text-black shadow-yellow-400/40" : "bg-slate-800 text-white border-white/20 shadow-black/40"
                )}>
                    {isMyTurn ? "★ YOUR TURN ★" : `${gameState.players[gameState.currentPlayerIndex]?.name}'s Turn`}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Color Change Alert */}
      <AnimatePresence>
          {gameState.activeColor && lastAction?.type === 'play' && lastAction.card?.color === 'wild' && (
              <motion.div
                key={gameState.activeColor + lastAction.id}
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-12 sm:top-24 left-0 right-0 flex justify-center pointer-events-none z-[700]"
              >
                  <div className={cn(
                      "px-8 py-2 rounded-2xl font-black text-white text-2xl uppercase italic border-4 border-white shadow-2xl",
                      gameState.activeColor === 'red' ? "bg-red-600" :
                      gameState.activeColor === 'blue' ? "bg-blue-600" :
                      gameState.activeColor === 'green' ? "bg-green-600" : "bg-yellow-500"
                  )}>
                      COLOR: {gameState.activeColor}!!
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* UNO! Action Button */}
      {me && me.hand.length <= 2 && !me.hasCalledUno && (
          <div className="absolute bottom-64 right-12 z-[1000]">
              <motion.button
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => callUno()}
                className="w-24 h-24 rounded-full bg-yellow-400 border-8 border-white shadow-[0_10px_40px_rgba(250,204,21,0.6)] flex items-center justify-center"
              >
                  <span className="text-2xl font-black text-black italic">UNO!</span>
              </motion.button>
          </div>
      )}

      {/* Color Picker Overlay */}
      <AnimatePresence>
          {showColorPicker && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <div className="bg-[#1e293b] p-12 rounded-[40px] border-8 border-white shadow-2xl text-center">
                <h2 className="text-4xl font-black mb-10 uppercase italic text-white tracking-tighter">Choose Color</h2>
                <div className="grid grid-cols-2 gap-6">
                  {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map(c => (
                    <motion.button
                      key={c}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => selectColor(c)}
                      className={cn(
                        "w-28 h-28 rounded-3xl border-[8px] border-white shadow-2xl",
                        c === 'red' ? 'bg-[#ff5555]' :
                        c === 'blue' ? 'bg-[#5555ff]' :
                        c === 'green' ? 'bg-[#55aa55]' : 'bg-[#ffaa00]'
                      )}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
