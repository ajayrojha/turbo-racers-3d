import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { GameEngine } from './game/engine';
import { CameraViewMode, ControlsInput, GameMode, GameSaveData, PlayerCarState, StuntNotification } from './game/types';
import { sounds } from './game/audio';
import { TouchControls } from './components/TouchControls';
import { GarageModal } from './components/GarageModal';
import { ModeSelectModal } from './components/ModeSelectModal';
import { HelpModal } from './components/HelpModal';
import { StuntBanner } from './components/StuntBanner';
import { ChallengeHUD } from './components/ChallengeHUD';
import { WinModal } from './components/WinModal';

const STORAGE_KEY = 'turbokids_road_race_save_v2';

const DEFAULT_CAR: PlayerCarState = {
  modelType: 'speedster',
  color: '#ef4444',
  accentColor: '#fbbf24',
  decal: 'checkered',
  speedLevel: 0,
  accelLevel: 0,
  nitroLevel: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Load persistent save data
  const [saveData, setSaveData] = useState<GameSaveData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      coins: 60, // Starter bonus coins
      unlockedCars: ['speedster', 'formula', 'drifter'],
      currentCar: DEFAULT_CAR,
      bestLapTime: null,
      grandPrixWins: 0,
      highwayHighDistance: 0,
      bestPinSmash: 0,
      starsCollectedTotal: 0,
      soundEnabled: true,
      musicEnabled: true,
      steeringMode: 'buttons',
    };
  });

  // Current car state
  const [carState, setCarState] = useState<PlayerCarState>(saveData.currentCar || DEFAULT_CAR);

  // Active game mode and camera
  const [gameMode, setGameMode] = useState<GameMode>('grandprix');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');

  // Live HUD telemetry
  const [speedKmh, setSpeedKmh] = useState(0);
  const [nitroPercent, setNitroPercent] = useState(100);
  const [stuntNotice, setStuntNotice] = useState<StuntNotification | null>(null);
  const [speedTrapAlert, setSpeedTrapAlert] = useState<number | null>(null);

  // Racing state
  const [racePosition, setRacePosition] = useState(5);
  const [currentLap, setCurrentLap] = useState(1);
  const [totalLaps] = useState(2);
  const [lapTimer, setLapTimer] = useState(0);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [pinsKnocked, setPinsKnocked] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  // Countdown overlay: 3, 2, 1, 0 (GO!), null
  const [raceCountdown, setRaceCountdown] = useState<number | null>(null);

  // Modals state
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isModeSelectOpen, setIsModeSelectOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Win modal state
  const [winModalData, setWinModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    stats: { label: string; value: string | number }[];
    coinsEarned: number;
    medal?: 'gold' | 'silver' | 'bronze';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    stats: [],
    coinsEarned: 0,
  });

  // Controls input reference
  const controlsRef = useRef<ControlsInput>({
    throttle: 0,
    steer: 0,
    nitro: false,
    handbrake: false,
    horn: false,
    reset: false,
  });

  // Save to localStorage helper
  const persistData = useCallback((updater: (prev: GameSaveData) => GameSaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Initialize Three.js Game Engine once per mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, carState);
    engineRef.current = engine;

    // Hook game events
    engine.physics.onStuntAwarded = (stunt) => {
      setStuntNotice(stunt);
    };

    engine.physics.onCoinCollected = (id, totalCoins) => {
      persistData((prev) => ({
        ...prev,
        coins: prev.coins + 1,
      }));
      // In Highway Rush, +2s bonus
      setTimeLeft((t) => Math.min(99, t + 2));
    };

    engine.physics.onStarCollected = (id, totalStars) => {
      persistData((prev) => ({
        ...prev,
        coins: prev.coins + 15,
        starsCollectedTotal: prev.starsCollectedTotal + 1,
      }));
    };

    engine.physics.onCheckpointPassed = (cpIndex, lap) => {
      setCurrentCheckpoint(cpIndex);
      setCurrentLap(lap);
    };

    engine.physics.onPositionChanged = (pos) => {
      setRacePosition(pos);
    };

    engine.physics.onSpeedTrapTriggered = (speed) => {
      setSpeedTrapAlert(speed);
      sounds.playStar();
      setTimeout(() => setSpeedTrapAlert(null), 3000);
    };

    // Throttled UI Telemetry updates (~22Hz) to keep React ultra lightweight and silky smooth
    let lastUiUpdate = 0;
    engine.onTick = (dt, pState) => {
      // Accumulate distance in Highway Rush
      if (pState.speedKmh > 5) {
        setDistanceTraveled((d) => d + (pState.speedKmh / 3.6) * dt);
      }

      const now = performance.now();
      if (now - lastUiUpdate > 45) {
        lastUiUpdate = now;
        setSpeedKmh(pState.speedKmh);
        setNitroPercent(Math.round(pState.nitroRemaining));
        setPinsKnocked(pState.pinsKnockedCount);
        setRacePosition(pState.racePosition);
      }
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [persistData]); // Run once on mount

  // Start Race Countdown helper
  const triggerRaceStart = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.physics.resetCar([0, 0.60, -40], 0);
    engineRef.current.snapCamera();
    setCurrentLap(1);
    setCurrentCheckpoint(0);
    setLapTimer(0);
    setRaceCountdown(3);
    sounds.playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setRaceCountdown(count);
        sounds.playCountdownBeep(false);
      } else if (count === 0) {
        setRaceCountdown(0);
        sounds.playCountdownBeep(true);
      } else {
        clearInterval(interval);
        setRaceCountdown(null);
      }
    }, 500);
  }, []);

  // Handle Game Mode initialization
  useEffect(() => {
    if (gameMode === 'grandprix') {
      triggerRaceStart();
      const timer = setInterval(() => {
        setLapTimer((t) => t + 0.1);
      }, 100);
      return () => clearInterval(timer);
    } else if (gameMode === 'highwayrush') {
      setTimeLeft(60);
      setDistanceTraveled(0);
      if (engineRef.current) {
        engineRef.current.physics.resetCar([0, 0.60, -40], 0);
        engineRef.current.snapCamera();
      }
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timer);
            return 0;
          }
          return t - 0.1;
        });
      }, 100);
      return () => clearInterval(timer);
    } else if (gameMode === 'timetrial') {
      setLapTimer(0);
      setCurrentCheckpoint(0);
      if (engineRef.current) {
        engineRef.current.physics.resetCar([0, 0.60, -40], 0);
        engineRef.current.snapCamera();
      }
      const timer = setInterval(() => {
        setLapTimer((lt) => lt + 0.1);
      }, 100);
      return () => clearInterval(timer);
    } else if (gameMode === 'freeroam') {
      if (engineRef.current) {
        engineRef.current.physics.resetCar([0, 0.60, -40], 0);
        engineRef.current.snapCamera();
      }
    }
  }, [gameMode, triggerRaceStart]);

  // Grand Prix 3-Lap Finish Condition
  useEffect(() => {
    if (gameMode === 'grandprix' && currentLap > totalLaps) {
      const finalPos = racePosition;
      const isWinner = finalPos === 1;
      const isPodium = finalPos <= 3;
      const medal = isWinner ? 'gold' : finalPos === 2 ? 'silver' : finalPos === 3 ? 'bronze' : undefined;
      const reward = isWinner ? 100 : finalPos === 2 ? 60 : finalPos === 3 ? 40 : 20;

      persistData((prev) => ({
        ...prev,
        coins: prev.coins + reward,
        grandPrixWins: isWinner ? prev.grandPrixWins + 1 : prev.grandPrixWins,
        bestLapTime: prev.bestLapTime ? Math.min(prev.bestLapTime, lapTimer / 3) : lapTimer / 3,
      }));

      setWinModalData({
        isOpen: true,
        title: isWinner ? 'Grand Prix Champion! 🏆' : isPodium ? 'Podium Finish! 🥈' : 'Race Finished!',
        subtitle: isWinner
          ? 'Incredible driving! You beat all 4 rival racers to take 1st Place!'
          : `Great race! You finished in Position P${finalPos} against top AI racers!`,
        stats: [
          { label: 'Final Finish', value: `P${finalPos} / 5` },
          { label: 'Total Race Time', value: `${lapTimer.toFixed(1)}s` },
          { label: 'Avg Lap Time', value: `${(lapTimer / 3).toFixed(1)}s` },
          { label: 'Rivals Defeated', value: `${5 - finalPos} Cars` },
        ],
        coinsEarned: reward,
        medal,
      });

      setGameMode('freeroam');
    }
  }, [currentLap, gameMode, lapTimer, persistData, racePosition, totalLaps]);

  // Highway Rush End Condition
  useEffect(() => {
    if (gameMode === 'highwayrush' && timeLeft <= 0) {
      const dist = Math.floor(distanceTraveled);
      const medal = dist >= 1000 ? 'gold' : dist >= 600 ? 'silver' : 'bronze';
      const reward = medal === 'gold' ? 60 : medal === 'silver' ? 40 : 25;

      persistData((prev) => ({
        ...prev,
        coins: prev.coins + reward,
        highwayHighDistance: Math.max(prev.highwayHighDistance, dist),
      }));

      setWinModalData({
        isOpen: true,
        title: 'Highway Speed Rush Complete! ⚡',
        subtitle: `You blazed down the highway for ${dist} meters!`,
        stats: [
          { label: 'Distance Covered', value: `${dist} m` },
          { label: 'Top Highway Medal', value: medal.toUpperCase() },
        ],
        coinsEarned: reward,
        medal,
      });

      setGameMode('freeroam');
    }
  }, [distanceTraveled, gameMode, persistData, timeLeft]);

  // Time Trial Lap Finish (12 checkpoints)
  useEffect(() => {
    if (gameMode === 'timetrial' && currentCheckpoint >= 12) {
      const finalTime = lapTimer;
      const medal = finalTime <= 38 ? 'gold' : finalTime <= 48 ? 'silver' : 'bronze';
      const reward = medal === 'gold' ? 50 : medal === 'silver' ? 30 : 15;

      persistData((prev) => ({
        ...prev,
        coins: prev.coins + reward,
        bestLapTime: prev.bestLapTime ? Math.min(prev.bestLapTime, finalTime) : finalTime,
      }));

      setWinModalData({
        isOpen: true,
        title: 'Circuit Lap Record Set! ⏱️',
        subtitle: `You completed the full circuit in ${finalTime.toFixed(1)} seconds!`,
        stats: [
          { label: 'Lap Record Time', value: `${finalTime.toFixed(1)}s` },
          { label: 'Trophy Grade', value: medal.toUpperCase() },
        ],
        coinsEarned: reward,
        medal,
      });

      setGameMode('freeroam');
    }
  }, [currentCheckpoint, gameMode, lapTimer, persistData]);

  // Handle controls update from TouchControls
  const handleInputChange = useCallback((newInput: ControlsInput) => {
    controlsRef.current = newInput;
    engineRef.current?.setControls(newInput);
  }, []);

  // Update Car in Engine & State
  const handleUpdateCar = (newCar: PlayerCarState) => {
    setCarState(newCar);
    persistData((prev) => ({
      ...prev,
      currentCar: newCar,
    }));
    engineRef.current?.updateCar(newCar);
  };

  // Cycle Camera Mode
  const handleCycleCamera = () => {
    sounds.playCheckpoint();
    const modes: CameraViewMode[] = ['chase', 'close', 'hood', 'arcade'];
    const nextIdx = (modes.indexOf(cameraMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setCameraMode(nextMode);
    engineRef.current?.setCameraMode(nextMode);
  };

  // Toggle Sound & Music
  const handleToggleSound = () => {
    const next = !saveData.soundEnabled;
    sounds.setMuted(!next);
    persistData((prev) => ({ ...prev, soundEnabled: next }));
  };

  const handleToggleMusic = () => {
    const next = !saveData.musicEnabled;
    sounds.setMusicMuted(!next);
    persistData((prev) => ({ ...prev, musicEnabled: next }));
  };

  const handleToggleSteerMode = () => {
    sounds.playCheckpoint();
    const modes: ('buttons' | 'wheel' | 'tilt')[] = ['buttons', 'wheel', 'tilt'];
    const nextIdx = (modes.indexOf(saveData.steeringMode) + 1) % modes.length;
    persistData((prev) => ({ ...prev, steeringMode: modes[nextIdx] }));
  };

  const handleSpendCoins = (amount: number): boolean => {
    if (saveData.coins >= amount) {
      persistData((prev) => ({ ...prev, coins: prev.coins - amount }));
      return true;
    }
    return false;
  };

  // Fullscreen toggle for iPad
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Speed Trap Radar Flash Overlay */}
      {speedTrapAlert !== null && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in-90 duration-150">
          <div className="flex items-center gap-3 px-6 py-3 bg-amber-400 text-slate-950 border-4 border-yellow-200 rounded-3xl shadow-2xl">
            <span className="text-3xl animate-bounce">📸</span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-800">SPEED RADAR SNAP!</div>
              <div className="font-mono-numbers text-2xl font-extrabold">{speedTrapAlert} KM/H!</div>
            </div>
          </div>
        </div>
      )}

      {/* Grand Prix Race Start Lights / Countdown */}
      {raceCountdown !== null && (
        <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div className="flex flex-col items-center animate-in zoom-in-75 duration-200">
            <div
              className={`font-display font-black text-8xl md:text-9xl drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] tracking-tight ${
                raceCountdown === 0 ? 'text-emerald-400 scale-125' : 'text-amber-400'
              }`}
            >
              {raceCountdown === 0 ? 'GO!' : raceCountdown}
            </div>
            <div className="text-white font-display font-black text-sm md:text-base uppercase tracking-widest mt-3 bg-slate-950/80 px-6 py-2 rounded-full border-2 border-white/20 shadow-2xl">
              {raceCountdown === 0 ? 'GREEN LIGHT! BURN RUBBER!' : 'STARTING GRID READY!'}
            </div>
          </div>
        </div>
      )}

      {/* Stunt Awards Banner */}
      <StuntBanner notification={stuntNotice} />

      {/* Challenge Game Mode HUD */}
      <ChallengeHUD
        mode={gameMode}
        timeLeft={timeLeft}
        lapTime={lapTimer}
        currentLap={currentLap}
        totalLaps={totalLaps}
        checkpointCurrent={currentCheckpoint}
        checkpointTotal={12}
        racePosition={racePosition}
        pinsKnocked={pinsKnocked}
        distanceTraveled={distanceTraveled}
      />

      {/* iPad Optimized Touch Controls & Top HUD */}
      <TouchControls
        onInputChange={handleInputChange}
        speedKmh={speedKmh}
        nitroPercent={nitroPercent}
        coinsCount={saveData.coins}
        starsCount={saveData.starsCollectedTotal}
        currentMode={gameMode}
        racePosition={racePosition}
        cameraMode={cameraMode}
        onCycleCamera={handleCycleCamera}
        onOpenGarage={() => setIsGarageOpen(true)}
        onOpenModeSelect={() => setIsModeSelectOpen(true)}
        onToggleHelp={() => setIsHelpOpen(true)}
        soundEnabled={saveData.soundEnabled}
        onToggleSound={handleToggleSound}
        musicEnabled={saveData.musicEnabled}
        onToggleMusic={handleToggleMusic}
        steerMode={saveData.steeringMode}
        onToggleSteerMode={handleToggleSteerMode}
      />

      {/* Fullscreen Button for iPad Safari in top center/right */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-30 p-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl text-slate-300 hover:text-white hidden sm:block active:scale-95"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* Modals */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        carState={carState}
        onUpdateCar={handleUpdateCar}
        coinsCount={saveData.coins}
        onSpendCoins={handleSpendCoins}
      />

      <ModeSelectModal
        isOpen={isModeSelectOpen}
        onClose={() => setIsModeSelectOpen(false)}
        currentMode={gameMode}
        onSelectMode={(m) => setGameMode(m)}
        bestLapTime={saveData.bestLapTime}
        grandPrixWins={saveData.grandPrixWins || 0}
        highwayHighDistance={saveData.highwayHighDistance || 0}
        bestPinSmash={saveData.bestPinSmash || 0}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <WinModal
        isOpen={winModalData.isOpen}
        onClose={() => setWinModalData((d) => ({ ...d, isOpen: false }))}
        title={winModalData.title}
        subtitle={winModalData.subtitle}
        stats={winModalData.stats}
        coinsEarned={winModalData.coinsEarned}
        medal={winModalData.medal}
        onPlayAgain={() => {
          setWinModalData((d) => ({ ...d, isOpen: false }));
          if (gameMode === 'grandprix') {
            triggerRaceStart();
          } else if (gameMode === 'highwayrush') {
            setTimeLeft(60);
            setDistanceTraveled(0);
          } else if (gameMode === 'timetrial') {
            setCurrentCheckpoint(0);
            setLapTimer(0);
          }
        }}
        onOpenGarage={() => setIsGarageOpen(true)}
      />
    </div>
  );
}
