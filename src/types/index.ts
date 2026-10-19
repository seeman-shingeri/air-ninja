export interface Point2D {
  x: number;
  y: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export type FruitType = 
  | 'watermelon'
  | 'orange'
  | 'apple'
  | 'banana'
  | 'strawberry'
  | 'pineapple';

export interface FruitDefinition {
  type: FruitType;
  name: string;
  radius: number;
  points: number;
  skinColor: string;
  pulpColor: string;
  innerColor: string;
  seedColor?: string;
  sliceSoundPitch: number;
}

export interface FruitHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  sliceAngle: number;
  type: FruitType;
  skinColor: string;
  pulpColor: string;
  innerColor: string;
  isLeft: boolean;
  alpha: number;
}

export interface Fruit {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  skinColor: string;
  pulpColor: string;
  innerColor: string;
  points: number;
  isSliced: boolean;
  sliceAngle: number;
  createdAt: number;
  halves?: [FruitHalf, FruitHalf];
}

export interface Bomb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  fuseTimer: number;
  isDetonated: boolean;
  createdAt: number;
}

export interface SlicePoint {
  x: number;
  y: number;
  timestamp: number;
}

export type ParticleShape = 'circle' | 'splat' | 'seed' | 'spark' | 'smoke';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  shape: ParticleShape;
  rotation: number;
  rotationSpeed: number;
}

export interface PopupText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  lifetime: number;
  createdAt: number;
}

export type SpecialPower = 'slow_motion' | 'double_score' | 'bomb_mode';

export interface PowerConfig {
  name: string;
  label: string;
  description: string;
  voiceCommand: string;
  duration: number; // seconds
  cooldown: number; // seconds
  color: string;
}

export interface ActivePowerState {
  power: SpecialPower;
  active: boolean;
  remainingTime: number; // seconds
  duration: number;
  cooldownRemaining: number; // seconds
}

export type GameMode = 'classic' | 'timed' | 'endless';

export type GameStatus = 'menu' | 'calibrating' | 'playing' | 'paused' | 'game_over';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  mode: GameMode;
  maxCombo: number;
  slices: number;
  bombsHit: number;
  date: string;
}

export type PerformanceMode = 'high' | 'medium' | 'low';
export type Sensitivity = 'low' | 'medium' | 'high';

export interface UserSettings {
  sensitivity: Sensitivity;
  mirrorCamera: boolean;
  soundVolume: number;
  performanceMode: PerformanceMode;
  reducedMotion: boolean;
  voiceEnabled: boolean;
  cameraEnabled: boolean;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface TrackingData {
  detected: boolean;
  fingertip: Point2D | null;
  velocity: Vector2D;
  confidence: number;
  handInFrame: boolean;
  isCalibrated: boolean;
}

export interface GameStats {
  score: number;
  lives: number;
  timer: number; // for timed challenge
  comboCount: number;
  comboMultiplier: number;
  maxCombo: number;
  totalSlices: number;
  totalBombsHit: number;
  fruitBreakdown: Record<FruitType, number>;
}
