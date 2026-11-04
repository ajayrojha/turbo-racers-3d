import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, ChevronRight, RotateCcw, Trophy, X, Zap } from 'lucide-react';
import { sounds } from '../game/audio';
import brothersBillboardUrl from '../assets/images/brothers_billboard_1793722144982.jpg';

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  stats: { label: string; value: string | number }[];
  coinsEarned: number;
  medal?: 'gold' | 'silver' | 'bronze';
  onPlayAgain: () => void;
  onOpenGarage: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  stats,
  coinsEarned,
  medal,
  onPlayAgain,
  onOpenGarage,
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.playStar();
      // Shoot festive kid celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#f97316'],
        });
      } catch (e) {
        console.warn('Confetti error', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border-2 border-amber-400/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Cartoon Brothers Hero Banner */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-950 border-b border-amber-400/30">
          <img
            src={brothersBillboardUrl}
            alt="Superstar Brothers Racing Champions"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

          <div className="absolute bottom-2 left-4 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
              Team Brothers
            </span>
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner with Trophy */}
        <div className="relative px-6 pt-3 pb-2 flex flex-col items-center text-center">
          <h2 className="font-display font-extrabold text-2xl text-white">{title}</h2>
          <p className="text-xs text-amber-300 font-semibold mt-0.5">{subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-800/80 border border-white/10 rounded-2xl text-center">
                <div className="text-[11px] text-slate-400 font-semibold">{s.label}</div>
                <div className="font-display font-extrabold text-lg text-white font-mono-numbers mt-0.5">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Reward Box */}
          <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center justify-between">
            <span className="font-display font-bold text-sm text-amber-300">Reward Earned:</span>
            <div className="flex items-center gap-1.5 font-display font-extrabold text-lg text-amber-300">
              <span>🪙</span>
              <span className="font-mono-numbers text-white">+{coinsEarned} Coins</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-6 border-t border-white/10 bg-slate-950/60 flex items-center gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-sm rounded-2xl border border-white/15 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Play Again</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenGarage();
            }}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <span>Garage</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
