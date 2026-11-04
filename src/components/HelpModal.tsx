import React from 'react';
import { Flag, HelpCircle, Keyboard, Smartphone, Trophy, X, Zap } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-xl text-slate-950 font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-white">How to Race & Controls</h2>
              <p className="text-xs text-slate-400">Master cornering, overtakes, and turbo boosts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* iPad Touch Controls */}
          <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-sky-400 mb-3">
              <Smartphone className="w-4 h-4" />
              <span>iPad & Touchscreen Controls</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="font-bold text-slate-300">Left Thumb:</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-700 rounded-lg font-bold">◀ ▶</span>
                  <span className="text-slate-400">Steer left & right</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-amber-500 text-slate-950 rounded-lg font-bold">📢</span>
                  <span className="text-slate-400">Honk horn at rivals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-700 rounded-lg font-bold">🔄</span>
                  <span className="text-slate-400">Flip / reset car on track</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-300">Right Thumb:</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-emerald-500 text-slate-950 rounded-lg font-bold">GO!</span>
                  <span className="text-slate-400">Accelerate forward</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-red-500 rounded-lg font-bold">BRAKE</span>
                  <span className="text-slate-400">Brake & reverse</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-orange-500 rounded-lg font-bold">TURBO</span>
                  <span className="text-slate-400">Hold for rocket nitro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Controls */}
          <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-amber-400 mb-2.5">
              <Keyboard className="w-4 h-4" />
              <span>Keyboard & Desktop Controls</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div><strong className="text-white font-mono">W / Up:</strong> Accelerate</div>
              <div><strong className="text-white font-mono">S / Down:</strong> Brake / Reverse</div>
              <div><strong className="text-white font-mono">A / Left:</strong> Steer Left</div>
              <div><strong className="text-white font-mono">D / Right:</strong> Steer Right</div>
              <div><strong className="text-white font-mono">Space:</strong> Handbrake Drift</div>
              <div><strong className="text-white font-mono">Shift / N:</strong> Rocket Nitro</div>
              <div><strong className="text-white font-mono">C:</strong> Cycle Camera Angle</div>
              <div><strong className="text-white font-mono">R:</strong> Reset Car to Track</div>
            </div>
          </div>

          {/* Pro Racing Tips */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-2xl text-xs space-y-2">
            <div className="font-display font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Grand Prix Pro Racing Tips:</span>
            </div>
            <p className="text-slate-300">
              • <strong>Overtaking Rivals:</strong> Follow in the slipstream of AI rivals on straights, then dive down the inside line on corners to advance from P5 to P1!
            </p>
            <p className="text-slate-300">
              • <strong>Apex Cornering & Drifting:</strong> Tap the brake or handbrake just as you turn into tight bends to initiate a power slide and earn drift score multipliers.
            </p>
            <p className="text-slate-300">
              • <strong>Save Nitro for the Straightaways:</strong> Fire your rocket nitro boost as you exit corners onto long straights to maximize top speed through the speed radar traps!
            </p>
            <p className="text-slate-300">
              • <strong>Collect Track Coins & Stars:</strong> Coins refill your nitro tank and let you purchase the Formula Blitz F1, Apex GT, and Street Drifter in the Garage!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-extrabold text-sm rounded-xl active:scale-95 transition-transform shadow-lg"
          >
            Ready to Race! 🏁
          </button>
        </div>
      </div>
    </div>
  );
};
