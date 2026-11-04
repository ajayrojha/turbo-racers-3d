import React from 'react';
import { Check, ChevronRight, Sparkles, Trophy, Wrench, X, Zap } from 'lucide-react';
import { CarConfig, CarModelType, PlayerCarState } from '../game/types';
import { sounds } from '../game/audio';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  carState: PlayerCarState;
  onUpdateCar: (newCar: PlayerCarState) => void;
  coinsCount: number;
  onSpendCoins: (amount: number) => boolean;
}

const CAR_OPTIONS: CarConfig[] = [
  {
    id: 'formula',
    name: 'Formula Blitz F1',
    tagline: 'Ultra-fast open-wheel grand prix racer with dual downforce wings',
    stats: { topSpeed: 125, acceleration: 95, handling: 95, boostPower: 90 },
    unlockCost: 0,
    bodyColor: '#ef4444',
    accentColor: '#ffffff',
    decal: 'checkered',
  },
  {
    id: 'speedster',
    name: 'Apex GT Supercar',
    tagline: 'Aerodynamic GT endurance racer with twin hood vents & rear spoiler',
    stats: { topSpeed: 115, acceleration: 88, handling: 90, boostPower: 85 },
    unlockCost: 0,
    bodyColor: '#3b82f6',
    accentColor: '#f59e0b',
    decal: 'stripes',
  },
  {
    id: 'drifter',
    name: 'Street Drifter Tuner',
    tagline: 'Widebody drift specialist with intercooler and quad exhaust pipes',
    stats: { topSpeed: 110, acceleration: 92, handling: 98, boostPower: 80 },
    unlockCost: 10,
    bodyColor: '#a855f7',
    accentColor: '#10b981',
    decal: 'lightning',
  },
  {
    id: 'cyber',
    name: 'Cyber Phantom 3000',
    tagline: 'Futuristic hypercar with front laser beam and cyan underglow',
    stats: { topSpeed: 130, acceleration: 98, handling: 82, boostPower: 95 },
    unlockCost: 25,
    bodyColor: '#18181b',
    accentColor: '#06b6d4',
    decal: 'lightning',
  },
  {
    id: 'monster',
    name: 'Thunder Racing Truck',
    tagline: 'Heavy-duty lifted stadium racer with giant all-terrain tires',
    stats: { topSpeed: 95, acceleration: 80, handling: 75, boostPower: 90 },
    unlockCost: 15,
    bodyColor: '#f97316',
    accentColor: '#1e293b',
    decal: 'flames',
  },
];

const COLORS = [
  { name: 'Racing Red', hex: '#ef4444' },
  { name: 'Velocity Blue', hex: '#3b82f6' },
  { name: 'Electric Yellow', hex: '#eab308' },
  { name: 'Acid Lime', hex: '#84cc16' },
  { name: 'Midnight Purple', hex: '#a855f7' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
  { name: 'Neon Orange', hex: '#f97316' },
  { name: 'Stealth Black', hex: '#18181b' },
  { name: 'Arctic White', hex: '#f8fafc' },
];

const DECALS: { id: 'checkered' | 'flames' | 'lightning' | 'stripes' | 'none'; label: string; icon: string }[] = [
  { id: 'checkered', label: 'Grand Prix #1', icon: '🏁' },
  { id: 'stripes', label: 'Twin GT Stripes', icon: '🏎️' },
  { id: 'flames', label: 'Flame Surge', icon: '🔥' },
  { id: 'lightning', label: 'Lightning Strike', icon: '⚡' },
  { id: 'none', label: 'Clean Gloss', icon: '✨' },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  carState,
  onUpdateCar,
  coinsCount,
  onSpendCoins,
}) => {
  if (!isOpen) return null;

  const handleSelectCar = (type: CarModelType) => {
    sounds.playCheckpoint();
    onUpdateCar({
      ...carState,
      modelType: type,
    });
  };

  const handleSelectColor = (hex: string) => {
    sounds.playCoin();
    onUpdateCar({
      ...carState,
      color: hex,
    });
  };

  const handleSelectDecal = (decal: 'checkered' | 'flames' | 'lightning' | 'stripes' | 'none') => {
    sounds.playCoin();
    onUpdateCar({
      ...carState,
      decal,
    });
  };

  const upgradeSpeed = () => {
    const cost = 5 + (carState.speedLevel || 0) * 5;
    if (onSpendCoins(cost)) {
      sounds.playStar();
      onUpdateCar({
        ...carState,
        speedLevel: (carState.speedLevel || 0) + 1,
      });
    }
  };

  const upgradeAccel = () => {
    const cost = 5 + (carState.accelLevel || 0) * 5;
    if (onSpendCoins(cost)) {
      sounds.playStar();
      onUpdateCar({
        ...carState,
        accelLevel: (carState.accelLevel || 0) + 1,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-950 font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">Race Garage & Tuning</h2>
              <p className="text-xs text-slate-400">Upgrade and customize your championship road racers</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 font-display font-bold text-sm">
              <span>🪙</span>
              <span className="font-mono-numbers text-white">{coinsCount}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Choose Car Type */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">
              1. Choose Race Machine
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {CAR_OPTIONS.map((car) => {
                const isSelected = car.id === carState.modelType;
                return (
                  <button
                    key={car.id}
                    onClick={() => handleSelectCar(car.id)}
                    className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all border-2 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800/80 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-3xl mb-1">
                      {car.id === 'formula'
                        ? '🏎️'
                        : car.id === 'speedster'
                        ? '⚡'
                        : car.id === 'drifter'
                        ? '🏁'
                        : car.id === 'cyber'
                        ? '🚀'
                        : '🚜'}
                    </span>
                    <span className="font-display font-bold text-xs text-white leading-tight">{car.name}</span>
                    <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{car.tagline}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Paint Colors */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">
              2. Body Paint Finish
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((col) => {
                const isSelected = carState.color.toLowerCase() === col.hex.toLowerCase();
                return (
                  <button
                    key={col.hex}
                    onClick={() => handleSelectColor(col.hex)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform border-2 ${
                      isSelected ? 'scale-110 border-white shadow-lg' : 'border-black/40 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {isSelected && (
                      <Check className={`w-5 h-5 ${col.hex === '#f8fafc' ? 'text-black' : 'text-white'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Decal Styles */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">
              3. Racing Livery Decal
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DECALS.map((d) => {
                const isSelected = carState.decal === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDecal(d.id)}
                    className={`py-2 px-3 rounded-xl flex items-center gap-2 transition-all border ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-800/80 border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span className="text-xs font-semibold">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Performance Tuning */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">
              4. Engine & Turbo Upgrades
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-display font-bold text-sm text-white">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Top Speed (Lvl {carState.speedLevel || 0}/5)</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Increases max velocity on straights</div>
                </div>
                <button
                  onClick={upgradeSpeed}
                  disabled={(carState.speedLevel || 0) >= 5}
                  className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1 ${
                    (carState.speedLevel || 0) >= 5
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                  }`}
                >
                  {(carState.speedLevel || 0) >= 5 ? 'MAX' : `Upgrade 🪙 ${5 + (carState.speedLevel || 0) * 5}`}
                </button>
              </div>

              <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-display font-bold text-sm text-white">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Acceleration (Lvl {carState.accelLevel || 0}/5)</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Rapid burst out of turns</div>
                </div>
                <button
                  onClick={upgradeAccel}
                  disabled={(carState.accelLevel || 0) >= 5}
                  className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1 ${
                    (carState.accelLevel || 0) >= 5
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 active:scale-95'
                  }`}
                >
                  {(carState.accelLevel || 0) >= 5 ? 'MAX' : `Upgrade 🪙 ${5 + (carState.accelLevel || 0) * 5}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-extrabold text-base rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center gap-2"
          >
            <span>Race This Car!</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
