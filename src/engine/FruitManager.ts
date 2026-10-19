import { FRUIT_DEFINITIONS, GAME_CONSTANTS } from '../config/gameConfig';
import { Bomb, Fruit, FruitHalf, FruitType, GameMode } from '../types';

export interface FruitManagerCallbacks {
  onFruitMissed?: (fruit: Fruit) => void;
}

export class FruitManager {
  public fruits: Fruit[] = [];
  public slicedHalves: FruitHalf[] = [];
  public bombs: Bomb[] = [];

  private spawnTimer = 0;
  private nextSpawnInterval = 1.2;
  private width = 800;
  private height = 600;
  private callbacks: FruitManagerCallbacks;
  private fruitTypes: FruitType[] = ['watermelon', 'orange', 'apple', 'banana', 'strawberry', 'pineapple'];

  constructor(callbacks: FruitManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Spawns a new fruit with parabolic trajectory calculated to arc across screen
   */
  public spawnFruit(specificType?: FruitType): Fruit {
    const type = specificType || this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
    const def = FRUIT_DEFINITIONS[type];

    // Spawn between 15% and 85% of screen width
    const minX = this.width * 0.15;
    const maxX = this.width * 0.85;
    const x = minX + Math.random() * (maxX - minX);
    const y = this.height + def.radius + 10;

    // Desired apex height between 18% and 45% from top
    const targetApexY = this.height * (0.18 + Math.random() * 0.27);
    const gravity = GAME_CONSTANTS.GRAVITY;
    const heightDifference = y - targetApexY;
    
    // vy = -sqrt(2 * g * h)
    const vy = -Math.sqrt(2 * gravity * heightDifference);

    // Aim horizontal velocity toward center
    const screenCenter = this.width / 2;
    const directionToCenter = (screenCenter - x) / this.width; // -0.5 to 0.5
    const vx = directionToCenter * (120 + Math.random() * 200) + (Math.random() - 0.5) * 60;

    const rotationSpeed = (Math.random() - 0.5) * 5.0;

    const fruit: Fruit = {
      id: `fruit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      x,
      y,
      vx,
      vy,
      radius: def.radius,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed,
      skinColor: def.skinColor,
      pulpColor: def.pulpColor,
      innerColor: def.innerColor,
      points: def.points,
      isSliced: false,
      sliceAngle: 0,
      createdAt: Date.now(),
    };

    this.fruits.push(fruit);
    return fruit;
  }

  /**
   * Spawns a bomb with safe physics
   */
  public spawnBomb(): Bomb {
    const minX = this.width * 0.2;
    const maxX = this.width * 0.8;
    const x = minX + Math.random() * (maxX - minX);
    const y = this.height + 40;

    const targetApexY = this.height * (0.22 + Math.random() * 0.25);
    const gravity = GAME_CONSTANTS.GRAVITY;
    const heightDifference = y - targetApexY;
    const vy = -Math.sqrt(2 * gravity * heightDifference);

    const screenCenter = this.width / 2;
    const directionToCenter = (screenCenter - x) / this.width;
    const vx = directionToCenter * (100 + Math.random() * 140);

    const bomb: Bomb = {
      id: `bomb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x,
      y,
      vx,
      vy,
      radius: 36,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 3.5,
      fuseTimer: 0,
      isDetonated: false,
      createdAt: Date.now(),
    };

    this.bombs.push(bomb);
    return bomb;
  }

  /**
   * Slices a fruit into two distinct halves and applies an outward separating impulse
   */
  public sliceFruit(fruit: Fruit, sliceAngle: number): [FruitHalf, FruitHalf] {
    fruit.isSliced = true;
    fruit.sliceAngle = sliceAngle;

    // Perpendicular vector for separating halves
    const normalX = Math.cos(sliceAngle + Math.PI / 2);
    const normalY = Math.sin(sliceAngle + Math.PI / 2);

    const splitSpeed = 120 + Math.random() * 60;

    const half1: FruitHalf = {
      x: fruit.x + normalX * 6,
      y: fruit.y + normalY * 6,
      vx: fruit.vx + normalX * splitSpeed,
      vy: fruit.vy + normalY * splitSpeed - 40,
      radius: fruit.radius,
      rotation: fruit.rotation,
      rotationSpeed: fruit.rotationSpeed - 2.5,
      sliceAngle,
      type: fruit.type,
      skinColor: fruit.skinColor,
      pulpColor: fruit.pulpColor,
      innerColor: fruit.innerColor,
      isLeft: true,
      alpha: 1.0,
    };

    const half2: FruitHalf = {
      x: fruit.x - normalX * 6,
      y: fruit.y - normalY * 6,
      vx: fruit.vx - normalX * splitSpeed,
      vy: fruit.vy - normalY * splitSpeed - 40,
      radius: fruit.radius,
      rotation: fruit.rotation,
      rotationSpeed: fruit.rotationSpeed + 2.5,
      sliceAngle,
      type: fruit.type,
      skinColor: fruit.skinColor,
      pulpColor: fruit.pulpColor,
      innerColor: fruit.innerColor,
      isLeft: false,
      alpha: 1.0,
    };

    fruit.halves = [half1, half2];
    this.slicedHalves.push(half1, half2);

    return [half1, half2];
  }

  /**
   * Main simulation step for fruit, bombs, and sliced halves
   */
  public update(
    dt: number,
    gameMode: GameMode,
    isBombModeActive = false,
    speedMultiplier = 1.0
  ): void {
    const effectiveDt = dt * speedMultiplier;
    const gravity = GAME_CONSTANTS.GRAVITY;

    // 1. Spawning logic
    this.spawnTimer += dt; // real time for spawn clock
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0;
      this.nextSpawnInterval =
        GAME_CONSTANTS.MIN_SPAWN_INTERVAL +
        Math.random() * (GAME_CONSTANTS.MAX_SPAWN_INTERVAL - GAME_CONSTANTS.MIN_SPAWN_INTERVAL);

      // Determine bomb chance
      let bombChance = GAME_CONSTANTS.BOMB_CHANCE_CLASSIC;
      if (gameMode === 'timed') bombChance = GAME_CONSTANTS.BOMB_CHANCE_TIMED;
      if (gameMode === 'endless') bombChance = GAME_CONSTANTS.BOMB_CHANCE_ENDLESS;
      if (isBombModeActive) bombChance = GAME_CONSTANTS.BOMB_CHANCE_BOMB_MODE;

      if (Math.random() < bombChance) {
        this.spawnBomb();
      }

      // Spawn 1 to 3 fruits in a wave
      const waveCount = Math.random() < 0.25 ? 2 : Math.random() < 0.08 ? 3 : 1;
      for (let i = 0; i < waveCount; i++) {
        this.spawnFruit();
      }
    }

    // 2. Update active fruits
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      if (f.isSliced) {
        this.fruits.splice(i, 1);
        continue;
      }

      f.x += f.vx * effectiveDt;
      f.y += f.vy * effectiveDt;
      f.vy += gravity * effectiveDt;
      f.rotation += f.rotationSpeed * effectiveDt;

      // Check if dropped below bottom of canvas
      if (f.y > this.height + f.radius + 30 && f.vy > 0) {
        this.fruits.splice(i, 1);
        if (this.callbacks.onFruitMissed) {
          this.callbacks.onFruitMissed(f);
        }
      }
    }

    // 3. Update bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      if (b.isDetonated) {
        this.bombs.splice(i, 1);
        continue;
      }

      b.x += b.vx * effectiveDt;
      b.y += b.vy * effectiveDt;
      b.vy += gravity * effectiveDt;
      b.rotation += b.rotationSpeed * effectiveDt;
      b.fuseTimer += effectiveDt;

      if (b.y > this.height + b.radius + 30 && b.vy > 0) {
        this.bombs.splice(i, 1);
      }
    }

    // 4. Update sliced halves
    for (let i = this.slicedHalves.length - 1; i >= 0; i--) {
      const h = this.slicedHalves[i];
      h.x += h.vx * effectiveDt;
      h.y += h.vy * effectiveDt;
      h.vy += gravity * effectiveDt;
      h.rotation += h.rotationSpeed * effectiveDt;
      h.alpha -= 0.75 * effectiveDt;

      if (h.alpha <= 0 || h.y > this.height + h.radius + 40) {
        this.slicedHalves.splice(i, 1);
      }
    }
  }

  public reset(): void {
    this.fruits = [];
    this.slicedHalves = [];
    this.bombs = [];
    this.spawnTimer = 0;
  }
}
