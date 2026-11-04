import React, { useEffect, useRef, useState } from 'react';
import { Camera, Flame, HelpCircle, Palette, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import { CameraViewMode, ControlsInput } from '../game/types';
import { sounds } from '../game/audio';

interface TouchControlsProps {
  onInputChange: (input: ControlsInput) => void;
  speedKmh: number;
  nitroPercent: number;
  coinsCount: number;
  starsCount: number;
  currentMode: string;
  racePosition?: number;
  cameraMode: CameraViewMode;
  onCycleCamera: () => void;
  onOpenGarage: () => void;
  onOpenModeSelect: () => void;
  onToggleHelp: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  steerMode: 'buttons' | 'wheel' | 'tilt';
  onToggleSteerMode: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputChange,
  speedKmh,
  nitroPercent,
  coinsCount,
  starsCount,
  currentMode,
  racePosition = 1,
  cameraMode,
  onCycleCamera,
  onOpenGarage,
  onOpenModeSelect,
  onToggleHelp,
  soundEnabled,
  onToggleSound,
  steerMode,
  onToggleSteerMode,
}) => {
  const inputRef = useRef<ControlsInput>({
    throttle: 0,
    steer: 0,
    nitro: false,
    handbrake: false,
    horn: false,
    reset: false,
  });

  const [activeGas, setActiveGas] = useState(false);
  const [activeBrake, setActiveBrake] = useState(false);
  const [activeLeft, setActiveLeft] = useState(false);
  const [activeRight, setActiveRight] = useState(false);
  const [activeNitro, setActiveNitro] = useState(false);
  const [activeHorn, setActiveHorn] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [showRotateHint, setShowRotateHint] = useState(false);

  const wheelCenterRef = useRef<{ x: number; y: number } | null>(null);

  const emitInput = () => {
    onInputChange({ ...inputRef.current });
  };

  // Check orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 640;
      setShowRotateHint(isPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Keyboard support for desktop testing
  const activeKeysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const isGameKey = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';
      return (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) ||
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) ||
        ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code) ||
        ['w', 'a', 's', 'd'].includes(key)
      );
    };

    const updateControlsFromKeys = () => {
      const keys = activeKeysRef.current;
      let throttle = 0;
      if (keys['ArrowUp'] || keys['arrowup'] || keys['KeyW'] || keys['w']) throttle += 1;
      if (keys['ArrowDown'] || keys['arrowdown'] || keys['KeyS'] || keys['s']) throttle -= 1;

      let steer = 0;
      if (keys['ArrowLeft'] || keys['arrowleft'] || keys['KeyA'] || keys['a']) steer -= 1;
      if (keys['ArrowRight'] || keys['arrowright'] || keys['KeyD'] || keys['d']) steer += 1;

      inputRef.current.throttle = throttle;
      inputRef.current.steer = steer;
      inputRef.current.nitro = !!(
        keys['ShiftLeft'] ||
        keys['ShiftRight'] ||
        keys['shift'] ||
        keys['KeyN'] ||
        keys['n']
      );
      inputRef.current.handbrake = !!(keys['Space'] || keys[' ']);
      inputRef.current.horn = !!(keys['KeyH'] || keys['h']);
      inputRef.current.reset = !!(keys['KeyR'] || keys['r']);

      setActiveGas(throttle > 0);
      setActiveBrake(throttle < 0);
      setActiveLeft(steer < 0);
      setActiveRight(steer > 0);
      setActiveNitro(inputRef.current.nitro);
      setActiveHorn(inputRef.current.horn);

      emitInput();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameKey(e)) {
        e.preventDefault();
      }

      sounds.unlockAudio();
      if (e.code) activeKeysRef.current[e.code] = true;
      if (e.key) activeKeysRef.current[e.key.toLowerCase()] = true;

      if (e.code === 'KeyC' || (e.key && e.key.toLowerCase() === 'c')) {
        onCycleCamera();
      }

      updateControlsFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isGameKey(e)) {
        e.preventDefault();
      }

      if (e.code) activeKeysRef.current[e.code] = false;
      if (e.key) activeKeysRef.current[e.key.toLowerCase()] = false;

      updateControlsFromKeys();
    };

    const handleWindowBlur = () => {
      activeKeysRef.current = {};
      updateControlsFromKeys();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onCycleCamera]);

  // iPad & Phone Gyroscope Tilt
  useEffect(() => {
    if (steerMode !== 'tilt') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0;
      const normalizedSteer = Math.max(-1, Math.min(1, gamma / 25));
      inputRef.current.steer = normalizedSteer;
      emitInput();
    };

    if (window.DeviceOrientationEvent && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((state: string) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [steerMode]);

  const setThrottle = (val: number) => {
    sounds.unlockAudio();
    inputRef.current.throttle = val;
    setActiveGas(val > 0);
    setActiveBrake(val < 0);
    emitInput();
  };

  const setSteer = (val: number) => {
    sounds.unlockAudio();
    inputRef.current.steer = val;
    setActiveLeft(val < 0);
    setActiveRight(val > 0);
    emitInput();
  };

  const setNitro = (val: boolean) => {
    sounds.unlockAudio();
    inputRef.current.nitro = val;
    setActiveNitro(val);
    emitInput();
  };

  const setHorn = (val: boolean) => {
    sounds.unlockAudio();
    inputRef.current.horn = val;
    setActiveHorn(val);
    emitInput();
  };

  const triggerReset = () => {
    sounds.unlockAudio();
    inputRef.current.reset = true;
    emitInput();
    setTimeout(() => {
      inputRef.current.reset = false;
      emitInput();
    }, 150);
  };

  // Virtual Steering Wheel pointer logic
  const handleWheelPointerDown = (e: React.PointerEvent) => {
    sounds.unlockAudio();
    const rect = e.currentTarget.getBoundingClientRect();
    wheelCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleWheelPointerMove = (e: React.PointerEvent) => {
    if (!wheelCenterRef.current) return;
    const dx = e.clientX - wheelCenterRef.current.x;
    const dy = e.clientY - wheelCenterRef.current.y;
    let angle = Math.atan2(dx, -dy);
    angle = Math.max(-1.1, Math.min(1.1, angle));
    setWheelAngle(angle);

    const steerVal = angle / 1.1;
    inputRef.current.steer = steerVal;
    setActiveLeft(steerVal < -0.1);
    setActiveRight(steerVal > 0.1);
    emitInput();
  };

  const handleWheelPointerUp = (e: React.PointerEvent) => {
    wheelCenterRef.current = null;
    setWheelAngle(0);
    inputRef.current.steer = 0;
    setActiveLeft(false);
    setActiveRight(false);
    emitInput();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 z-20 select-none touch-none">
      {/* Phone Portrait Mode Rotate Suggestion */}
      {showRotateHint && (
        <div className="pointer-events-auto absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border-2 border-amber-400 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce">
          <span className="text-xl">📱↔️</span>
          <span className="font-bold">Turn phone sideways (Landscape) for best racing!</span>
          <button
            onClick={() => setShowRotateHint(false)}
            className="ml-1 text-slate-400 hover:text-white font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP HEADER BAR (Ergonomic & Compact on Phone & iPad) */}
      <header className="flex items-center justify-between gap-1.5 sm:gap-3 pointer-events-auto w-full max-w-7xl mx-auto">
        {/* Left: Quick Navigation (Garage & Race Events) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenGarage}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-transform"
            title="Open Garage"
          >
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Garage</span>
          </button>

          <button
            onClick={onOpenModeSelect}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900/85 hover:bg-slate-850 backdrop-blur-md border border-white/20 text-white font-display font-bold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-transform"
            title="Select Race Event"
          >
            <span>🏁</span>
            <span className="hidden xs:inline">Events</span>
          </button>
        </div>

        {/* Center: Racing Speedometer Cluster & Nitro Gauge */}
        <div className="flex flex-col items-center bg-slate-900/90 backdrop-blur-md border border-white/20 px-3 sm:px-6 py-1 sm:py-1.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base">
              {speedKmh < 5 ? '🛑' : speedKmh < 30 ? '🐢' : speedKmh < 70 ? '🏎️' : '🚀'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-black text-xl sm:text-2xl text-white font-mono-numbers tracking-tight">
                {speedKmh}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider">KM/H</span>
            </div>
          </div>

          {/* Nitro Fuel Bar */}
          <div className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-white/10 flex">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75 rounded-full"
              style={{ width: `${nitroPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Coins, Camera, Audio & Help */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Coins Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 backdrop-blur-md border border-amber-400/40 rounded-xl text-amber-300 font-display font-bold text-xs sm:text-sm shadow-md">
            <span>🪙</span>
            <span className="font-mono-numbers text-white">{coinsCount}</span>
          </div>

          {/* Camera View Cycle */}
          <button
            onClick={onCycleCamera}
            className="p-1.5 sm:p-2 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-xl text-white active:scale-95 transition-transform"
            title={`Camera: ${cameraMode}`}
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 sm:p-2 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-xl text-white active:scale-95 transition-transform"
            title="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
          </button>

          {/* Steer Mode Cycle */}
          <button
            onClick={onToggleSteerMode}
            className="hidden sm:flex px-2 py-1.5 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-transform"
            title="Switch steering controls"
          >
            {steerMode === 'buttons' ? '⇄ Keys' : steerMode === 'wheel' ? '⭕ Wheel' : '📱 Tilt'}
          </button>

          {/* Help */}
          <button
            onClick={onToggleHelp}
            className="p-1.5 sm:p-2 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-xl text-white active:scale-95 transition-transform"
            title="Help & Controls"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* BOTTOM THUMB CONTROLS (Responsive for Phone & iPad) */}
      <div className="flex items-end justify-between w-full pb-2 sm:pb-4 pointer-events-auto max-w-7xl mx-auto">
        {/* LEFT HAND THUMB ZONE: STEERING & UTILITIES */}
        <div className="flex items-end gap-1.5 sm:gap-3">
          {steerMode === 'buttons' ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Steer Left */}
              <button
                onPointerDown={(e) => {
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                  setSteer(-1);
                }}
                onPointerUp={(e) => {
                  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                  setSteer(0);
                }}
                onPointerCancel={(e) => {
                  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                  setSteer(0);
                }}
                className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-xl transition-all border-2 touch-none select-none ${
                  activeLeft
                    ? 'bg-sky-500 border-sky-200 text-white scale-90 shadow-sky-500/50'
                    : 'bg-slate-900/85 backdrop-blur-lg border-white/25 text-white active:bg-sky-600'
                }`}
              >
                ◀
              </button>

              {/* Steer Right */}
              <button
                onPointerDown={(e) => {
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                  setSteer(1);
                }}
                onPointerUp={(e) => {
                  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                  setSteer(0);
                }}
                onPointerCancel={(e) => {
                  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                  setSteer(0);
                }}
                className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-xl transition-all border-2 touch-none select-none ${
                  activeRight
                    ? 'bg-sky-500 border-sky-200 text-white scale-90 shadow-sky-500/50'
                    : 'bg-slate-900/85 backdrop-blur-lg border-white/25 text-white active:bg-sky-600'
                }`}
              >
                ▶
              </button>
            </div>
          ) : steerMode === 'wheel' ? (
            <div
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-900/85 backdrop-blur-lg border-4 border-amber-400/80 shadow-2xl flex items-center justify-center cursor-pointer touch-none select-none"
              style={{
                transform: `rotate(${wheelAngle}rad)`,
                transition: wheelCenterRef.current ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              <div className="w-20 h-5 sm:w-24 sm:h-6 bg-slate-700 rounded-full flex items-center justify-between px-2 border border-white/20">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <div className="text-[9px] sm:text-[10px] font-bold text-white tracking-widest uppercase">STEER</div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-1.5 touch-none select-none">
              <span>📱</span>
              <span>Tilt to steer</span>
            </div>
          )}

          {/* Horn & Reset Car Buttons */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <button
              onPointerDown={(e) => {
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                setHorn(true);
              }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                setHorn(false);
              }}
              onPointerCancel={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                setHorn(false);
              }}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shadow-md border touch-none select-none ${
                activeHorn
                  ? 'bg-yellow-400 border-yellow-200 scale-95 shadow-yellow-400/60'
                  : 'bg-yellow-500/90 border-yellow-300/40 text-slate-950'
              }`}
              title="Honk Horn"
            >
              📢
            </button>

            <button
              onClick={triggerReset}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-800/90 border border-white/20 flex items-center justify-center text-white shadow-md active:scale-95 active:bg-slate-700 touch-none select-none"
              title="Flip / Reset Car"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* RIGHT HAND THUMB ZONE: TURBO, BRAKE, GO */}
        <div className="flex items-end gap-1.5 sm:gap-3">
          {/* Turbo Nitro */}
          <button
            onPointerDown={(e) => {
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
              setNitro(true);
            }}
            onPointerUp={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
              setNitro(false);
            }}
            onPointerCancel={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
              setNitro(false);
            }}
            className={`w-12 h-14 sm:w-16 sm:h-22 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-0.5 font-display font-extrabold text-[11px] sm:text-xs shadow-xl transition-all border-2 touch-none select-none ${
              activeNitro
                ? 'bg-orange-500 border-yellow-200 text-white scale-90 shadow-orange-500/80 animate-nitro'
                : 'bg-gradient-to-t from-orange-600 to-amber-500 border-amber-300/60 text-white active:brightness-110'
            }`}
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-300 text-yellow-100" />
            <span className="tracking-wider">TURBO</span>
          </button>

          {/* Brake & Reverse */}
          <button
            onPointerDown={(e) => {
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
              setThrottle(-1);
            }}
            onPointerUp={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
              setThrottle(0);
            }}
            onPointerCancel={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
              setThrottle(0);
            }}
            className={`w-14 h-16 sm:w-20 sm:h-24 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-0.5 font-display font-extrabold text-xs sm:text-sm shadow-xl transition-all border-2 touch-none select-none ${
              activeBrake
                ? 'bg-red-600 border-red-300 text-white scale-95 shadow-red-500/80'
                : 'bg-red-500/90 border-red-300/60 text-white active:bg-red-600'
            }`}
          >
            <span className="text-lg sm:text-xl">🛑</span>
            <span>BRAKE</span>
          </button>

          {/* Full Throttle Forward */}
          <button
            onPointerDown={(e) => {
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
              setThrottle(1);
            }}
            onPointerUp={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
              setThrottle(0);
            }}
            onPointerCancel={(e) => {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
              setThrottle(0);
            }}
            className={`w-16 h-20 sm:w-24 sm:h-28 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-0.5 font-display font-black text-sm sm:text-base shadow-xl transition-all border-2 touch-none select-none ${
              activeGas
                ? 'bg-emerald-500 border-emerald-200 text-slate-950 scale-95 shadow-emerald-500/80'
                : 'bg-emerald-400 border-emerald-200 text-slate-950 active:bg-emerald-500'
            }`}
          >
            <span className="text-2xl sm:text-3xl">🚀</span>
            <span className="tracking-wider">GO!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
