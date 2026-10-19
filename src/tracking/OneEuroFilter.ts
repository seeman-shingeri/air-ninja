/**
 * One Euro Filter for low-latency adaptive jitter reduction
 * Casiez, G., Roussel, N. and Vogel, D. (2012)
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = value;
    this.s = alpha * value + (1 - alpha) * (this.s as number);
    return this.s;
  }

  public hasLastRawValue(): boolean {
    return this.y !== null;
  }

  public lastRawValue(): number {
    return this.y ?? 0;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(value: number, timestamp: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilter.filter(value, 1.0);
    }

    const dt = Math.max(1e-4, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    const dx = this.xFilter.hasLastRawValue()
      ? (value - this.xFilter.lastRawValue()) / dt
      : 0;

    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * 2D One Euro filter. Unlike two independent 1D filters, the adaptive cutoff is driven by
 * the combined speed of the point, so both axes are smoothed equally and diagonal swipes
 * keep their true direction instead of bending toward the faster axis.
 */
export class Point2DSmoother {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private x: number | null = null;
  private y: number | null = null;
  private rawX = 0;
  private rawY = 0;
  private speed = 0;
  private lastTime: number | null = null;

  // dCutoff is higher than the 1 Hz textbook default so the speed estimate reacts within a
  // frame or two: otherwise the first frames of a swipe are still heavily smoothed and lag
  constructor(minCutoff = 1.5, beta = 0.02, dCutoff = 3.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, y: number, timestamp = performance.now()): { x: number; y: number } {
    if (this.x === null || this.y === null || this.lastTime === null) {
      this.x = this.rawX = x;
      this.y = this.rawY = y;
      this.speed = 0;
      this.lastTime = timestamp;
      return { x, y };
    }

    const dt = Math.max(1e-4, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    const rawSpeed = Math.hypot(x - this.rawX, y - this.rawY) / dt;
    this.rawX = x;
    this.rawY = y;
    this.speed += Point2DSmoother.alpha(this.dCutoff, dt) * (rawSpeed - this.speed);

    const a = Point2DSmoother.alpha(this.minCutoff + this.beta * this.speed, dt);
    this.x += a * (x - this.x);
    this.y += a * (y - this.y);
    return { x: this.x, y: this.y };
  }

  public reset(): void {
    this.x = null;
    this.y = null;
    this.speed = 0;
    this.lastTime = null;
  }
}
