import { GAME_CONSTANTS } from '../config/gameConfig';
import { Particle, PerformanceMode } from '../types';

export class ParticleSystem {
  private pool: Particle[] = [];
  private poolSize: number;

  constructor(performanceMode: PerformanceMode = 'high') {
    this.poolSize = GAME_CONSTANTS.PARTICLE_POOL_SIZE[performanceMode] || 250;
    this.initPool();
  }

  private initPool(): void {
    this.pool = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 3,
        color: '#ffffff',
        alpha: 1,
        decay: 0.02,
        shape: 'circle',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  public setPerformanceMode(mode: PerformanceMode): void {
    this.poolSize = GAME_CONSTANTS.PARTICLE_POOL_SIZE[mode] || 200;
    if (this.pool.length < this.poolSize) {
      const diff = this.poolSize - this.pool.length;
      for (let i = 0; i < diff; i++) {
        this.pool.push({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 3,
          color: '#ffffff',
          alpha: 1,
          decay: 0.02,
          shape: 'circle',
          rotation: 0,
          rotationSpeed: 0,
        });
      }
    }
  }

  private getInactiveParticle(): Particle | null {
    for (let i = 0; i < this.poolSize; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  /**
   * Emits a burst of fruit juice and pulp particles upon slicing
   */
  public emitFruitSlice(
    x: number,
    y: number,
    sliceAngle: number,
    pulpColor: string,
    skinColor: string,
    seedColor?: string
  ): void {
    // Normal to slice angle
    const perp1 = sliceAngle + Math.PI / 2;
    const perp2 = sliceAngle - Math.PI / 2;

    const count = Math.min(30, Math.floor(this.poolSize * 0.15));

    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      // Half go to perp1, half to perp2 with variance
      const baseAngle = Math.random() < 0.5 ? perp1 : perp2;
      const angle = baseAngle + (Math.random() - 0.5) * 0.9;
      const speed = 120 + Math.random() * 320;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 15;
      p.y = y + (Math.random() - 0.5) * 15;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = 2.5 + Math.random() * 4.5;
      p.color = Math.random() < 0.75 ? pulpColor : skinColor;
      p.alpha = 1.0;
      p.decay = 0.8 + Math.random() * 0.9; // per second
      p.shape = Math.random() < 0.4 ? 'splat' : 'circle';
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 8;
    }

    // Emit seeds if fruit has seeds
    if (seedColor) {
      const seedCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < seedCount; i++) {
        const p = this.getInactiveParticle();
        if (!p) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 180;

        p.active = true;
        p.x = x + (Math.random() - 0.5) * 10;
        p.y = y + (Math.random() - 0.5) * 10;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.radius = 2.0;
        p.color = seedColor;
        p.alpha = 1.0;
        p.decay = 0.6 + Math.random() * 0.4;
        p.shape = 'seed';
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 6;
      }
    }
  }

  /**
   * Emits bomb fuse sparks
   */
  public emitBombFuse(x: number, y: number): void {
    const p = this.getInactiveParticle();
    if (!p) return;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 40 + Math.random() * 90;

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.radius = 1.8 + Math.random() * 2.2;
    p.color = Math.random() < 0.6 ? '#ffeb3b' : '#ff5722';
    p.alpha = 1.0;
    p.decay = 2.5 + Math.random() * 1.5; // fast spark decay
    p.shape = 'spark';
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 10;
  }

  /**
   * Emits a massive bomb explosion burst
   */
  public emitBombExplosion(x: number, y: number): void {
    const count = Math.min(60, Math.floor(this.poolSize * 0.35));

    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 450;
      const isSmoke = Math.random() < 0.35;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = isSmoke ? 6 + Math.random() * 12 : 3 + Math.random() * 6;
      p.color = isSmoke
        ? '#555555'
        : Math.random() < 0.5
        ? '#ff1744'
        : '#ff9100';
      p.alpha = 1.0;
      p.decay = isSmoke ? 0.7 + Math.random() * 0.5 : 1.2 + Math.random() * 1.0;
      p.shape = isSmoke ? 'smoke' : 'spark';
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 6;
    }
  }

  /**
   * Updates all active particles with delta time and gravity
   */
  public update(dt: number, speedMultiplier = 1.0): void {
    const effectiveDt = dt * speedMultiplier;
    const gravity = GAME_CONSTANTS.GRAVITY * 0.65;

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.x += p.vx * effectiveDt;
      p.y += p.vy * effectiveDt;
      
      // Air resistance
      p.vx *= 0.985;
      p.vy *= 0.985;

      // Gravity affects juice, splats, and seeds
      if (p.shape !== 'smoke') {
        p.vy += gravity * effectiveDt;
      } else {
        p.vy -= 40 * effectiveDt; // Smoke rises gently
      }

      p.rotation += p.rotationSpeed * effectiveDt;
      p.alpha -= p.decay * effectiveDt;

      if (p.alpha <= 0) {
        p.active = false;
        p.alpha = 0;
      }
    }
  }

  /**
   * Renders active particles onto the canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'seed') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.8, p.radius * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'splat') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Circle / juice drop
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  public reset(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool[i].active = false;
    }
  }
}
