import React from 'react';
import { Flag, Gauge, Sparkles, Timer, Trophy, X, Zap } from 'lucide-react';
import { GameMode } from '../game/types';
import { sounds } from '../game/audio';

interface ModeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  bestLapTime: number | null;
  grandPrixWins: number;
  highwayHighDistance: number;
  bestPinSmash: number;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  bestLapTime,
  grandPrixWins,
  highwayHighDistance,
  bestPinSmash,
}) => {
  if (!isOpen) return null;

  const MODES: {
    id: GameMode;
    title: string;
    icon: string;
    tagline: string;
    description: string;
    badgeText?: string;
    themeColor: string;
  }[] = [
    {
      id: 'grandprix',
      title: 'Grand Prix Championship',
      icon: '🏆',
      tagline: '3-Lap Race vs 4 AI Rivals!',
      description: 'Line up on the starting grid, watch the race lights turn green, and overtake rival race cars to take 1st Place (P1)!',
      badgeText: grandPrixWins > 0 ? `${grandPrixWins} Grand Prix Wins` : undefined,
      themeColor: 'border-amber-400 bg-amber-500/10 text-amber-400',
    },
    {
      id: 'highwayrush',
      title: 'Highway Speed Rush',
      icon: '⚡',
      tagline: 'High-speed traffic dodge sprint!',
      description: 'Floor the gas pedal, weave past traffic, grab golden nitro rings, and cover maximum distance before the clock runs out!',
      badgeText: highwayHighDistance > 0 ? `Record: ${Math.floor(highwayHighDistance)}m` : undefined,
      themeColor: 'border-orange-400 bg-orange-500/10 text-orange-400',
    },
    {
      id: 'timetrial',
      title: 'Circuit Time Trial',
      icon: '⏱️',
      tagline: 'Beat the speedway lap record!',
      description: 'Race against time through 12 neon checkpoint gates with banked turns, high-speed straights, and speed radar traps!',
      badgeText: bestLapTime ? `Best: ${bestLapTime.toFixed(1)}s` : undefined,
      themeColor: 'border-sky-400 bg-sky-500/10 text-sky-400',
    },
    {
      id: 'freeroam',
      title: 'Speedway Free Drive',
      icon: '🏎️',
      tagline: 'Stunt ramps, bowling pins & coins!',
      description: 'Practice high-speed drifting, launch off mega stunt jumps, smash 10 giant bowling pins, and hunt for 6 secret gold stars.',
      badgeText: bestPinSmash > 0 ? `Pins: ${bestPinSmash}/10` : undefined,
      themeColor: 'border-emerald-400 bg-emerald-500/10 text-emerald-400',
    },
  ];

  const handleSelect = (mode: GameMode) => {
    sounds.playCheckpoint();
    onSelectMode(mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-slate-950 font-bold">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-white">Select Race Event</h2>
              <p className="text-xs text-slate-400">Choose your circuit challenge and burn rubber</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode List */}
        <div className="p-6 space-y-3.5 overflow-y-auto max-h-[75vh]">
          {MODES.map((m) => {
            const isSelected = currentMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/80 border-white/10 hover:border-white/30 hover:bg-slate-800'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-700/80 flex items-center justify-center text-3xl shrink-0 border border-white/10 shadow-inner">
                  {m.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-extrabold text-base text-white">{m.title}</h3>
                    {m.badgeText && (
                      <span className="text-[11px] font-bold text-amber-300 font-mono-numbers bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/30">
                        🏆 {m.badgeText}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">{m.tagline}</div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
