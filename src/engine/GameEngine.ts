import { FRUIT_DEFINITIONS, GAME_CONSTANTS, POWER_CONFIGS } from '../config/gameConfig';
import {
  ActivePowerState,
  Bomb,
  Fruit,
  FruitType,
  GameMode,
  GameStats,
  GameStatus,
  Point2D,
  PopupText,
  SlicePoint,
  SpecialPower,
  UserSettings,
} from '../types';
import { CollisionDetector } from './CollisionDetector';
import { FruitManager } from './FruitManager';
import { GameRenderer } from './GameRenderer';
import { ParticleSystem } from './ParticleSystem';
import { SoundManager } from '../audio/SoundManager';
import { VoiceAction, VoiceActionResult } from '../voice/VoiceManager';

export interface GameEngineCallbacks {
  onStatsChange?: (stats: GameStats) => void;
  onStatusChange?: (status: GameStatus) => void;
  onPowersChange?: (powers: Record<SpecialPower, ActivePowerState>) => void;
  onGameOver?: (stats: GameStats) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private status: GameStatus = 'menu';
  private gameMode: GameMode = 'classic';
  private userSettings: UserSettings;
  private callbacks: GameEngineCallbacks;

  // Subsystems
  public fruitManager: FruitManager;
  public particleSystem: ParticleSystem;
  public soundManager: SoundManager;

  // Loop & Timing
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private isRunning = false;

  // Blade trail & pointer
  public trail: SlicePoint[] = [];
  public currentFingertip: Point2D | null = null;
  public isHandTracking = false;

  // Game Stats
  public stats: GameStats = {
    score: 0,
    lives: GAME_CONSTANTS.CLASSIC_STARTING_LIVES,
    timer: GAME_CONSTANTS.TIMED_DURATION_SECONDS,
    comboCount: 0,
    comboMultiplier: 1,
    maxCombo: 0,
    totalSlices: 0,
    totalBombsHit: 0,
    fruitBreakdown: {
      watermelon: 0,
      orange: 0,
      apple: 0,
      banana: 0,
      strawberry: 0,
      pineapple: 0,
    },
  };

  // Combo timer
  private lastSliceTimestamp = 0;

  // Special Powers
  public powers: Record<SpecialPower, ActivePowerState> = {
    slow_motion: {
      power: 'slow_motion',
      active: false,
      remainingTime: 0,
      duration: POWER_CONFIGS.slow_motion.duration,
      cooldownRemaining: 0,
    },
    double_score: {
      power: 'double_score',
      active: false,
      remainingTime: 0,
      duration: POWER_CONFIGS.double_score.duration,
      cooldownRemaining: 0,
    },
    bomb_mode: {
      power: 'bomb_mode',
      active: false,
      remainingTime: 0,
      duration: POWER_CONFIGS.bomb_mode.duration,
      cooldownRemaining: 0,
    },
  };

  // Popups
  private popups: PopupText[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    userSettings: UserSettings,
    callbacks: GameEngineCallbacks = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    this.userSettings = userSettings;
    this.callbacks = callbacks;

    this.soundManager = new SoundManager(userSettings.soundVolume);
    this.particleSystem = new ParticleSystem(userSettings.performanceMode);

    this.fruitManager = new FruitManager({
      onFruitMissed: (fruit) => this.handleFruitMissed(fruit),
    });

    this.handleResize();
  }

  public handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const fallbackW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const fallbackH = typeof window !== 'undefined' ? window.innerHeight : 600;
    const fallbackDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const width = Math.floor(rect.width) || fallbackW;
    const height = Math.floor(rect.height) || fallbackH;

    const dprCap = GAME_CONSTANTS.DPR_CAP[this.userSettings.performanceMode] || 1.5;
    const dpr = Math.min(fallbackDpr, dprCap);

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.fruitManager.setDimensions(width, height);
  }

  public getWidth(): number {
    const rect = this.canvas.getBoundingClientRect();
    const fallbackW = typeof window !== 'undefined' ? window.innerWidth : 800;
    return Math.floor(rect.width) || fallbackW;
  }

  public getHeight(): number {
    const rect = this.canvas.getBoundingClientRect();
    const fallbackH = typeof window !== 'undefined' ? window.innerHeight : 600;
    return Math.floor(rect.height) || fallbackH;
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
  }

  public setUserSettings(settings: UserSettings): void {
    this.userSettings = settings;
    this.soundManager.setVolume(settings.soundVolume);
    this.particleSystem.setPerformanceMode(settings.performanceMode);
    this.handleResize();
  }

  public startRound(mode: GameMode): void {
    this.gameMode = mode;
    this.status = 'playing';

    // Reset stats
    this.stats = {
      score: 0,
      lives: mode === 'classic' ? GAME_CONSTANTS.CLASSIC_STARTING_LIVES : 999,
      timer: mode === 'timed' ? GAME_CONSTANTS.TIMED_DURATION_SECONDS : 0,
      comboCount: 0,
      comboMultiplier: 1,
      maxCombo: 0,
      totalSlices: 0,
      totalBombsHit: 0,
      fruitBreakdown: {
        watermelon: 0,
        orange: 0,
        apple: 0,
        banana: 0,
        strawberry: 0,
        pineapple: 0,
      },
    };

    // Reset powers
    (Object.keys(this.powers) as SpecialPower[]).forEach((p) => {
      this.powers[p].active = false;
      this.powers[p].remainingTime = 0;
      this.powers[p].cooldownRemaining = 0;
    });

    this.fruitManager.reset();
    this.particleSystem.reset();
    this.trail = [];
    this.popups = [];
    this.lastFrameTime = performance.now();

    this.notifyStats();
    this.notifyPowers();
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange('playing');
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this.loop(performance.now());
    }
  }

  public pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('paused');
      }
    }
  }

  public resume(): void {
    if (this.status === 'paused') {
      this.status = 'playing';
      this.lastFrameTime = performance.now();
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('playing');
      }
    }
  }

  public gameOver(): void {
    if (this.status === 'game_over') return;
    this.status = 'game_over';

    this.soundManager.playGameOver();

    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange('game_over');
    }
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.stats);
    }
  }

  public exitToMenu(): void {
    this.status = 'menu';
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.fruitManager.reset();
    this.particleSystem.reset();
    this.trail = [];
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange('menu');
    }
  }

  /**
   * Activates a special power
   */
  public triggerPower(power: SpecialPower): boolean {
    if (this.status !== 'playing') return false;
    const pState = this.powers[power];
    if (pState.cooldownRemaining > 0) return false;

    pState.active = true;
    pState.remainingTime = pState.duration;
    pState.cooldownRemaining = POWER_CONFIGS[power].cooldown;

    this.soundManager.playPowerActivate(power);
    this.addPopup(POWER_CONFIGS[power].label + '!', this.getWidth() / 2, this.getHeight() * 0.35, POWER_CONFIGS[power].color, 1.6);

    this.notifyPowers();
    return true;
  }

  /**
   * Dispatches a voice action directly to the game engine
   */
  public dispatchVoiceAction(action: VoiceAction): VoiceActionResult {
    if (this.status !== 'playing') {
      const msg = this.status === 'paused' ? 'Game is paused' : 'Game not active';
      return { success: false, message: msg, action };
    }

    switch (action.type) {
      case 'SLOW_MOTION': {
        const ok = this.triggerPower('slow_motion');
        return {
          success: ok,
          message: ok ? 'SLOW MOTION ACTIVATED!' : 'Slow motion on cooldown',
          action,
        };
      }
      case 'DOUBLE_SCORE': {
        const ok = this.triggerPower('double_score');
        return {
          success: ok,
          message: ok ? 'DOUBLE SCORE ACTIVATED!' : 'Double score on cooldown',
          action,
        };
      }
      case 'BOMB_MODE': {
        const ok = this.triggerPower('bomb_mode');
        return {
          success: ok,
          message: ok ? 'BOMB MODE ACTIVATED!' : 'Bomb mode on cooldown',
          action,
        };
      }
      case 'SLICE_FRUIT': {
        if (!action.fruitType) {
          return { success: false, message: 'Invalid fruit command', action };
        }
        const spoken = action.spokenName || FRUIT_DEFINITIONS[action.fruitType]?.name || action.fruitType;
        const sliced = this.sliceFruitByVoice(action.fruitType, spoken);
        if (sliced) {
          return {
            success: true,
            message: `${spoken.toUpperCase()} SLICED BY VOICE`,
            action,
          };
        } else {
          return {
            success: false,
            message: `No ${spoken.toLowerCase()} available.`,
            action,
          };
        }
      }
      default:
        return { success: false, message: 'Unknown action', action };
    }
  }

  /**
   * Slices an on-screen fruit of the spoken type.
   * Deterministically selects the most visible / nearest-to-center eligible fruit.
   * Never slices bombs, off-screen fruits, or already-sliced fruits.
   */
  public sliceFruitByVoice(type: FruitType, spokenName?: string): boolean {
    if (this.status !== 'playing') return false;

    const width = this.getWidth();
    const height = this.getHeight();
    const centerX = width / 2;
    const centerY = height / 2;

    let target: Fruit | null = null;
    let minDistanceSq = Infinity;

    for (const fruit of this.fruitManager.fruits) {
      if (fruit.isSliced || fruit.type !== type) continue;

      // Must be on-screen / in view
      const isVisible =
        fruit.y - fruit.radius <= height &&
        fruit.y + fruit.radius >= 0 &&
        fruit.x - fruit.radius <= width &&
        fruit.x + fruit.radius >= 0;

      if (!isVisible) continue;

      // Deterministic rule: select nearest to screen center
      const dx = fruit.x - centerX;
      const dy = fruit.y - centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        target = fruit;
      }
    }

    if (!target) return false;

    const sliceAngle = (Math.random() - 0.5) * Math.PI;
    const displayName = (spokenName || FRUIT_DEFINITIONS[type].name).toUpperCase();
    this.addPopup(`${displayName} VOICED!`, target.x, target.y - target.radius - 24, '#00e5ff', 1.15);
    this.handleFruitSliced(target, sliceAngle, { x: target.x, y: target.y });
    return true;
  }

  /**
   * Feed new fingertip or cursor coordinates into the blade trail
   */
  public updateFingertip(point: Point2D | null, isHand = true): void {
    this.currentFingertip = point;
    this.isHandTracking = isHand;

    if (!point) {
      this.trail = [];
      return;
    }

    const now = performance.now();
    this.trail.push({ x: point.x, y: point.y, timestamp: now });

    // Limit trail length according to performance mode
    const maxPoints = GAME_CONSTANTS.TRAIL_MAX_POINTS[this.userSettings.performanceMode] || 20;
    if (this.trail.length > maxPoints) {
      this.trail.shift();
    }

    // Check collision if playing
    if (this.status === 'playing' && this.trail.length >= 2) {
      const p1 = this.trail[this.trail.length - 2];
      const p2 = this.trail[this.trail.length - 1];
      this.checkCollisions(p1, p2);
    }
  }

  /**
   * Performs segment-to-object collisions against all active fruits and bombs
   */
  private checkCollisions(p1: Point2D, p2: Point2D): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const swipeDist = Math.sqrt(dx * dx + dy * dy);

    // Audio whoosh when swiping fast
    if (swipeDist > 40) {
      this.soundManager.playWhoosh(swipeDist * 10);
    }

    // 1. Check fruits
    for (let i = 0; i < this.fruitManager.fruits.length; i++) {
      const fruit = this.fruitManager.fruits[i];
      if (fruit.isSliced) continue;

      const hit = CollisionDetector.checkFruitSlice(fruit, p1, p2);
      if (hit.hit) {
        this.handleFruitSliced(fruit, hit.sliceAngle, hit.hitPoint);
      }
    }

    // 2. Check bombs
    for (let i = 0; i < this.fruitManager.bombs.length; i++) {
      const bomb = this.fruitManager.bombs[i];
      if (bomb.isDetonated) continue;

      const hit = CollisionDetector.checkBombSlice(bomb, p1, p2);
      if (hit.hit) {
        this.handleBombSliced(bomb, hit.hitPoint);
      }
    }
  }

  private handleFruitSliced(fruit: Fruit, sliceAngle: number, hitPoint: Point2D): void {
    // 1. Split fruit
    this.fruitManager.sliceFruit(fruit, sliceAngle);

    // 2. Emit juicy particles
    this.particleSystem.emitFruitSlice(
      hitPoint.x,
      hitPoint.y,
      sliceAngle,
      fruit.pulpColor,
      fruit.skinColor,
      fruit.type === 'watermelon' || fruit.type === 'apple' ? '#212121' : undefined
    );

    // 3. Sound
    this.soundManager.playFruitSlice(fruit.type);

    // 4. Combo tracking
    const now = performance.now();
    if (now - this.lastSliceTimestamp <= GAME_CONSTANTS.COMBO_WINDOW_MS) {
      this.stats.comboCount++;
    } else {
      this.stats.comboCount = 1;
    }
    this.lastSliceTimestamp = now;

    // Combo multiplier
    let multiplier = 1;
    if (this.stats.comboCount >= 3) {
      multiplier = Math.min(5, this.stats.comboCount - 1);
      this.soundManager.playCombo(multiplier);
      this.addPopup(`COMBO x${multiplier}!`, hitPoint.x, hitPoint.y - 20, '#ffd700', 1.3);
    }
    this.stats.comboMultiplier = multiplier;
    if (this.stats.comboCount > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.comboCount;
    }

    // 5. Score calculation (apply double score power if active)
    const powerMultiplier = this.powers.double_score.active ? 2 : 1;
    const gainedPoints = fruit.points * multiplier * powerMultiplier;
    this.stats.score += gainedPoints;
    this.stats.totalSlices++;
    this.stats.fruitBreakdown[fruit.type]++;

    // Score popup
    this.addPopup(`+${gainedPoints}`, hitPoint.x, hitPoint.y, fruit.pulpColor, 1.0);

    this.notifyStats();
  }

  private handleBombSliced(bomb: Bomb, hitPoint: Point2D): void {
    bomb.isDetonated = true;
    this.particleSystem.emitBombExplosion(hitPoint.x, hitPoint.y);
    this.soundManager.playBombExplosion();

    this.stats.totalBombsHit++;
    this.stats.score = Math.max(0, this.stats.score - GAME_CONSTANTS.BOMB_PENALTY_SCORE);
    this.stats.comboCount = 0;
    this.stats.comboMultiplier = 1;

    this.addPopup(`-${GAME_CONSTANTS.BOMB_PENALTY_SCORE} BOMB!`, hitPoint.x, hitPoint.y, '#ff1744', 1.4);

    if (this.gameMode === 'classic') {
      this.stats.lives -= GAME_CONSTANTS.BOMB_PENALTY_LIVES;
      if (this.stats.lives <= 0) {
        this.stats.lives = 0;
        this.gameOver();
      }
    }

    this.notifyStats();
  }

  private handleFruitMissed(fruit: Fruit): void {
    if (this.status !== 'playing') return;

    if (this.gameMode === 'classic') {
      this.stats.lives--;
      this.stats.comboCount = 0;
      this.stats.comboMultiplier = 1;
      this.addPopup('MISS!', fruit.x, this.getHeight() - 40, '#ff5252', 1.2);

      if (this.stats.lives <= 0) {
        this.stats.lives = 0;
        this.gameOver();
      }
      this.notifyStats();
    }
  }

  private addPopup(text: string, x: number, y: number, color: string, scale = 1.0): void {
    this.popups.push({
      id: `pop_${Date.now()}_${Math.random()}`,
      text,
      x: Math.max(40, Math.min(this.getWidth() - 40, x)),
      y: Math.max(40, y),
      color,
      scale,
      alpha: 1.0,
      lifetime: 0.85,
      createdAt: performance.now(),
    });
  }

  /**
   * Main simulation and render step
   */
  private loop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const rawDt = Math.max(0.001, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    // Safety clamp dt
    const dt = Math.min(rawDt, GAME_CONSTANTS.MAX_DELTA_TIME);

    if (this.status === 'playing') {
      this.updateSimulation(dt);
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private updateSimulation(dt: number): void {
    // 1. Powers countdown
    let powersChanged = false;
    const isSlowMo = this.powers.slow_motion.active;
    const speedMultiplier = isSlowMo ? 0.35 : 1.0;

    (Object.keys(this.powers) as SpecialPower[]).forEach((pKey) => {
      const p = this.powers[pKey];
      if (p.active) {
        p.remainingTime -= dt;
        if (p.remainingTime <= 0) {
          p.active = false;
          p.remainingTime = 0;
          powersChanged = true;
        }
      }

      if (p.cooldownRemaining > 0) {
        p.cooldownRemaining -= dt;
        if (p.cooldownRemaining <= 0) {
          p.cooldownRemaining = 0;
          powersChanged = true;
        }
      }
    });

    if (powersChanged) {
      this.notifyPowers();
    }

    // 2. Timed mode countdown
    if (this.gameMode === 'timed') {
      this.stats.timer -= dt;
      if (this.stats.timer <= 0) {
        this.stats.timer = 0;
        this.gameOver();
      }
      this.notifyStats();
    }

    // 3. Update fruit & bomb physics
    this.fruitManager.update(
      dt,
      this.gameMode,
      this.powers.bomb_mode.active,
      speedMultiplier
    );

    // 4. Update particles
    this.particleSystem.update(dt, speedMultiplier);

    // 5. Clean expired popups
    const now = performance.now();
    for (let i = this.popups.length - 1; i >= 0; i--) {
      if ((now - this.popups[i].createdAt) / 1000 > this.popups[i].lifetime) {
        this.popups.splice(i, 1);
      }
    }

    // 6. Fade blade trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      if ((now - this.trail[i].timestamp) / 1000 > GAME_CONSTANTS.TRAIL_POINT_MAX_AGE) {
        this.trail.splice(i, 1);
      }
    }
  }

  private render(): void {
    const width = this.getWidth();
    const height = this.getHeight();

    // 1. Arena Background
    GameRenderer.renderBackground(this.ctx, width, height, {
      slow_motion: this.powers.slow_motion.active,
      double_score: this.powers.double_score.active,
      bomb_mode: this.powers.bomb_mode.active,
    });

    // 2. Sliced halves
    for (const half of this.fruitManager.slicedHalves) {
      GameRenderer.renderFruitHalf(this.ctx, half);
    }

    // 3. Fruits
    for (const fruit of this.fruitManager.fruits) {
      GameRenderer.renderFruit(this.ctx, fruit);
    }

    // 4. Bombs
    for (const bomb of this.fruitManager.bombs) {
      GameRenderer.renderBomb(this.ctx, bomb);
    }

    // 5. Particles
    this.particleSystem.render(this.ctx);

    // 6. Blade trail
    GameRenderer.renderBladeTrail(this.ctx, this.trail, GAME_CONSTANTS.TRAIL_POINT_MAX_AGE);

    // 7. Fingertip reticle cursor
    GameRenderer.renderFingertipCursor(this.ctx, this.currentFingertip, this.isHandTracking);

    // 8. Popups
    GameRenderer.renderPopups(this.ctx, this.popups, performance.now());
  }

  private notifyStats(): void {
    if (this.callbacks.onStatsChange) {
      this.callbacks.onStatsChange({ ...this.stats });
    }
  }

  private notifyPowers(): void {
    if (this.callbacks.onPowersChange) {
      this.callbacks.onPowersChange({
        slow_motion: { ...this.powers.slow_motion },
        double_score: { ...this.powers.double_score },
        bomb_mode: { ...this.powers.bomb_mode },
      });
    }
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.fruitManager.reset();
    this.particleSystem.reset();
    this.trail = [];
    this.popups = [];
  }
}
