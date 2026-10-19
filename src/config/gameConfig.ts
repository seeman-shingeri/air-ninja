import { FruitDefinition, FruitType, PowerConfig, SpecialPower, UserSettings } from '../types';

export const FRUIT_DEFINITIONS: Record<FruitType, FruitDefinition> = {
  watermelon: {
    type: 'watermelon',
    name: 'Watermelon',
    radius: 46,
    points: 1,
    skinColor: '#2e7d32', // Dark green rind
    pulpColor: '#e53935', // Bright red juicy flesh
    innerColor: '#c62828',
    seedColor: '#212121',
    sliceSoundPitch: 0.85,
  },
  orange: {
    type: 'orange',
    name: 'Orange',
    radius: 38,
    points: 2,
    skinColor: '#f57c00', // Rich orange peel
    pulpColor: '#ffa726', // Bright citrus pulp
    innerColor: '#ffe082', // Segment membrane
    sliceSoundPitch: 1.0,
  },
  apple: {
    type: 'apple',
    name: 'Apple',
    radius: 36,
    points: 2,
    skinColor: '#d32f2f', // Crimson red
    pulpColor: '#fff9c4', // Pale cream
    innerColor: '#5d4037', // Apple core seed
    seedColor: '#3e2723',
    sliceSoundPitch: 1.1,
  },
  banana: {
    type: 'banana',
    name: 'Banana',
    radius: 32,
    points: 3,
    skinColor: '#fbc02d', // Bright yellow peel
    pulpColor: '#fffde7', // Pale banana flesh
    innerColor: '#fff9c4',
    seedColor: '#8d6e63',
    sliceSoundPitch: 1.25,
  },
  strawberry: {
    type: 'strawberry',
    name: 'Strawberry',
    radius: 28,
    points: 4,
    skinColor: '#e91e63', // Deep vibrant strawberry
    pulpColor: '#f06292',
    innerColor: '#ffffff',
    seedColor: '#fff59d',
    sliceSoundPitch: 1.4,
  },
  pineapple: {
    type: 'pineapple',
    name: 'Pineapple',
    radius: 48,
    points: 5,
    skinColor: '#e65100', // Prickly brown/orange
    pulpColor: '#ffeb3b', // Golden yellow
    innerColor: '#fff176',
    sliceSoundPitch: 0.95,
  },
};

export const POWER_CONFIGS: Record<SpecialPower, PowerConfig> = {
  slow_motion: {
    name: 'Slow Motion',
    label: 'Slow Mo',
    description: 'Slows down fruit and bomb trajectories to 0.35x speed',
    voiceCommand: 'Slow motion!',
    duration: 5.0, // 5 seconds
    cooldown: 15.0, // 15 seconds cooldown
    color: '#00e5ff', // Neon cyan
  },
  double_score: {
    name: 'Double Score',
    label: 'Double Score',
    description: 'Doubles all sliced fruit points',
    voiceCommand: 'Double score!',
    duration: 8.0, // 8 seconds
    cooldown: 15.0,
    color: '#ffd700', // Radiant gold
  },
  bomb_mode: {
    name: 'Bomb Mode',
    label: 'Bomb Mode',
    description: 'Surges bomb spawns for high-risk frenzy — survive for massive score bonuses!',
    voiceCommand: 'Bomb mode!',
    duration: 6.0, // 6 seconds
    cooldown: 18.0,
    color: '#ff1744', // Danger crimson
  },
};

export const GAME_CONSTANTS = {
  // Physics
  GRAVITY: 850, // pixels/second^2
  MAX_DELTA_TIME: 0.1, // Clamp delta time to 100ms max to prevent physics explosion after tab switch
  FRUIT_ROTATION_SPEED_MIN: -4.0,
  FRUIT_ROTATION_SPEED_MAX: 4.0,
  
  // Slicing
  MIN_SWIPE_SPEED: 180, // pixels/second minimum to register as a slice
  TRAIL_POINT_MAX_AGE: 0.22, // seconds trail remains visible
  COMBO_WINDOW_MS: 380, // milliseconds between slices to trigger combo
  
  // Game modes
  CLASSIC_STARTING_LIVES: 3,
  TIMED_DURATION_SECONDS: 60,
  
  // Spawning
  MIN_SPAWN_INTERVAL: 0.8, // seconds
  MAX_SPAWN_INTERVAL: 2.2, // seconds
  BOMB_CHANCE_CLASSIC: 0.16,
  BOMB_CHANCE_TIMED: 0.22,
  BOMB_CHANCE_ENDLESS: 0.08,
  BOMB_CHANCE_BOMB_MODE: 0.55,
  
  // Penalties
  BOMB_PENALTY_SCORE: 10,
  BOMB_PENALTY_LIVES: 1,
  
  // Particle pooling
  PARTICLE_POOL_SIZE: {
    high: 350,
    medium: 150,
    low: 50,
  },
  
  // Trail length
  TRAIL_MAX_POINTS: {
    high: 28,
    medium: 18,
    low: 10,
  },
  
  // Max DPR
  DPR_CAP: {
    high: 2.0,
    medium: 1.5,
    low: 1.0,
  },
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  sensitivity: 'medium',
  mirrorCamera: true,
  soundVolume: 0.8,
  performanceMode: 'high',
  reducedMotion: false,
  voiceEnabled: true,
  cameraEnabled: true,
};

export const SENSITIVITY_FACTORS: Record<UserSettings['sensitivity'], number> = {
  low: 0.75,
  medium: 1.0,
  high: 1.35,
};
