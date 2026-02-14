'use client';

import { Card as CardType, CardColor } from '@/lib/uno';
import { cn } from '@/lib/utils'; // I'll create this utility

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const colorMap: Record<string, string> = {
  red: 'bg-[#ff5555]',
  blue: 'bg-[#5555ff]',
  green: 'bg-[#55aa55]',
  yellow: 'bg-[#ffaa00]',
  wild: 'bg-[#000000]',
};

export default function Card({ card, onClick, disabled, isPlayable = true, size = 'md' }: CardProps) {
  const isWild = card.color === 'wild';
  
  const sizeClasses = {
    sm: 'w-14 h-20 text-[0.8rem]',
    md: 'w-20 h-32 text-xl',
    lg: 'w-28 h-44 text-3xl',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || !isPlayable}
      className={cn(
        sizeClasses[size],
        colorMap[card.color],
        "relative rounded-[12px] border-[6px] border-white shadow-xl transition-all duration-300",
        "flex flex-col items-center justify-center font-black text-white overflow-hidden",
        !isPlayable && "opacity-60 grayscale-[0.6] blur-[0.5px] scale-95 cursor-not-allowed",
        isPlayable && !disabled && "hover:-translate-y-6 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] active:scale-90 hover:z-50"
      )}
    >
      {/* Iconic Uno Oval */}
      <div className={cn(
        "absolute w-[140%] h-[70%] rotate-[-45deg] bg-white/20 rounded-[100%]",
        isWild && "bg-gradient-to-br from-red-500 via-blue-500 to-green-500 opacity-40"
      )} />
      
      {/* Corner Value (Top Left) */}
      <div className="absolute top-1 left-1.5 text-[0.5em] leading-none drop-shadow-md">
        {card.value === 'skip' && 'Ø'}
        {card.value === 'reverse' && '⇄'}
        {card.value === 'draw2' && '+2'}
        {card.value === 'wildDraw4' && '+4'}
        {Number.isInteger(parseInt(card.value)) && card.value}
      </div>

      {/* Main Center Value */}
      <span className="relative z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] italic text-[1.4em]">
        {card.value === 'skip' && 'Ø'}
        {card.value === 'reverse' && '⇄'}
        {card.value === 'draw2' && '+2'}
        {card.value === 'wild' && 'W'}
        {card.value === 'wildDraw4' && '+4'}
        {Number.isInteger(parseInt(card.value)) && card.value}
      </span>

      {/* Corner Value (Bottom Right - Inverted) */}
      <div className="absolute bottom-1 right-1.5 text-[0.5em] leading-none drop-shadow-md rotate-180">
        {card.value === 'skip' && 'Ø'}
        {card.value === 'reverse' && '⇄'}
        {card.value === 'draw2' && '+2'}
        {card.value === 'wildDraw4' && '+4'}
        {Number.isInteger(parseInt(card.value)) && card.value}
      </div>
    </button>
  );
}
