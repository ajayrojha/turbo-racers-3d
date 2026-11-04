import React from 'react';
import { Flag, Gauge, Sparkles, Timer, Trophy } from 'lucide-react';
import { GameMode } from '../game/types';

interface ChallengeHUDProps {
  mode: GameMode;
  timeLeft: number;
  lapTime: number;
  currentLap: number;
  totalLaps: number;
  checkpointCurrent: number;
  checkpointTotal: number;
  racePosition: number;
  pinsKnocked: number;
  distanceTraveled?: number;
}

export const ChallengeHUD: React.FC<ChallengeHUDProps> = ({
  mode,
  timeLeft,
  lapTime,
  currentLap,
  totalLaps,
  checkpointCurrent,
  checkpointTotal,
  racePosition,
  pinsKnocked,
  distanceTraveled = 0,
}) => {
  if (mode === 'grandprix') {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center gap-2.5">
        {/* Race Position Badge (P1, P2, etc.) */}
        <div
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-2xl border font-display font-extrabold text-sm shadow-xl ${
            racePosition === 1
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-yellow-200'
              : racePosition <= 3
              ? 'bg-slate-900/90 text-amber-300 border-amber-400/40'
              : 'bg-slate-900/85 text-slate-300 border-white/20'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="font-mono-numbers text-lg">P{racePosition}</span>
          <span className="text-xs opacity-75">/ 5</span>
        </div>

        {/* Lap Counter */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-2xl font-display font-bold text-sm text-white shadow-lg">
          <Flag className="w-4 h-4 text-emerald-400" />
          <span>LAP</span>
          <span className="font-mono-numbers text-emerald-300 text-base">
            {Math.min(currentLap, totalLaps)} / {totalLaps}
          </span>
        </div>

        {/* Live Lap Timer */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-2xl font-display font-bold text-sm text-white shadow-lg">
          <Timer className="w-4 h-4 text-amber-400" />
          <span className="font-mono-numbers text-amber-300 text-base">{lapTime.toFixed(1)}s</span>
        </div>
      </div>
    );
  }

  if (mode === 'highwayrush') {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600/90 to-amber-600/90 backdrop-blur-md border border-yellow-300/40 rounded-2xl font-display font-extrabold text-sm text-white shadow-xl">
          <Gauge className="w-4 h-4 text-yellow-300" />
          <span>DISTANCE:</span>
          <span className="font-mono-numbers text-lg text-yellow-200">{Math.floor(distanceTraveled)} M</span>
        </div>
      </div>
    );
  }

  if (mode === 'timetrial') {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-2xl font-display font-bold text-sm text-white shadow-lg">
          <Timer className="w-4 h-4 text-amber-400" />
          <span>LAP TIME:</span>
          <span className="font-mono-numbers text-amber-300 text-base">{lapTime.toFixed(1)}s</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-2xl font-display font-bold text-sm text-white shadow-lg">
          <Flag className="w-4 h-4 text-emerald-400" />
          <span>GATE:</span>
          <span className="font-mono-numbers text-emerald-300 text-base">
            {checkpointCurrent} / {checkpointTotal}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20">
      <div className="px-4 py-1.5 bg-slate-900/80 backdrop-blur-md border border-white/20 rounded-full text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-lg">
        <span className="text-emerald-400">🏁 Grand Prix Speedway</span>
        <span className="text-slate-500">•</span>
        <span className="text-amber-300">Free Practice & Stunt Arena</span>
      </div>
    </div>
  );
};
