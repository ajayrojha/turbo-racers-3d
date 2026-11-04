import * as THREE from 'three';

export type CarModelType = 'formula' | 'speedster' | 'monster' | 'cyber' | 'drifter';

export interface CarStats {
  topSpeed: number; // in km/h
  acceleration: number; // 0-100 responsiveness
  handling: number; // steering sharpness
  boostPower: number; // nitro acceleration
}

export interface CarConfig {
  id: CarModelType;
  name: string;
  tagline: string;
  stats: CarStats;
  unlockCost: number;
  bodyColor: string;
  accentColor: string;
  decal: 'checkered' | 'flames' | 'lightning' | 'stripes' | 'none';
}

export interface PlayerCarState {
  modelType: CarModelType;
  color: string;
  accentColor: string;
  decal: 'checkered' | 'flames' | 'lightning' | 'stripes' | 'none';
  speedLevel: number;
  accelLevel: number;
  nitroLevel: number;
}

export interface ControlsInput {
  throttle: number; // -1 (reverse/brake) to 1 (full forward)
  steer: number; // -1 (full left) to 1 (full right)
  nitro: boolean;
  handbrake: boolean;
  horn: boolean;
  reset: boolean;
}

export type CameraViewMode = 'chase' | 'close' | 'hood' | 'arcade';

export type GameMode = 'grandprix' | 'highwayrush' | 'timetrial' | 'freeroam';

export interface CollectibleItem {
  id: string;
  type: 'coin' | 'star' | 'boost_ring';
  position: [number, number, number];
  collected: boolean;
  mesh?: any;
}

export interface AIRacer {
  id: string;
  name: string;
  modelType: CarModelType;
  color: string;
  accentColor: string;
  speed: number;
  baseMaxSpeed: number;
  pos: THREE.Vector3;
  rotY: number;
  waypointIndex: number;
  lap: number;
  lapProgress: number;
  rig?: any;
}

export interface BowlingPin {
  id: number;
  originalPos: [number, number, number];
  pos: [number, number, number];
  rot: [number, number, number];
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  knocked: boolean;
  mesh?: any;
}

export interface CheckpointGate {
  id: number;
  position: [number, number, number];
  rotationY: number;
  radius: number;
  mesh?: any;
}

export interface StuntNotification {
  id: number;
  text: string;
  points: number;
  subtext?: string;
}

export interface GameSaveData {
  coins: number;
  unlockedCars: CarModelType[];
  currentCar: PlayerCarState;
  bestLapTime: number | null; // seconds
  grandPrixWins: number;
  highwayHighDistance: number;
  bestPinSmash: number;
  starsCollectedTotal: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  steeringMode: 'buttons' | 'wheel' | 'tilt';
}
