import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Point2D, Vector2D } from '../types';
import { Point2DSmoother } from './OneEuroFilter';
import { CoordinateMapper } from './CoordinateMapper';

export type TrackerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'tracking'
  | 'lost'
  | 'error'
  | 'fallback';

export interface HandTrackerCallbacks {
  onStatusChange?: (status: TrackerStatus, error?: string) => void;
  onFingertipMove?: (point: Point2D, velocity: Vector2D, rawLandmark?: Point2D) => void;
  onTrackingLost?: () => void;
}

export interface HandTrackerOptions {
  canvasWidth: number;
  canvasHeight: number;
  mirrored?: boolean;
  sensitivity?: 'low' | 'medium' | 'high';
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private status: TrackerStatus = 'idle';
  private smoother: Point2DSmoother;
  private callbacks: HandTrackerCallbacks;
  private options: HandTrackerOptions;

  private lastTrackingTime = 0;
  private lastPoint: Point2D | null = null;
  private lastVelocity: Vector2D = { x: 0, y: 0 };
  private lastTimestamp = 0;
  private isProcessing = false;
  private trackingLostTimeout = 320; // ms grace period before declaring hand lost
  private isCleanedUp = false;

  // Inference throttling: minimum 20ms between inferences (up to 50 inferences/sec)
  private minInferenceInterval = 20;
  private lastInferenceTime = 0;

  constructor(options: HandTrackerOptions, callbacks: HandTrackerCallbacks = {}) {
    this.options = { mirrored: true, sensitivity: 'medium', ...options };
    this.callbacks = callbacks;

    // Responsive beta values for One Euro Filter: higher beta = zero lag during fast movement
    const beta = options.sensitivity === 'high' ? 0.035 : options.sensitivity === 'low' ? 0.012 : 0.022;
    this.smoother = new Point2DSmoother(1.0, beta);
  }

  public setDimensions(width: number, height: number): void {
    this.options.canvasWidth = width;
    this.options.canvasHeight = height;
  }

  public setMirrored(mirrored: boolean): void {
    this.options.mirrored = mirrored;
  }

  public setSensitivity(sensitivity: 'low' | 'medium' | 'high'): void {
    this.options.sensitivity = sensitivity;
    const beta = sensitivity === 'high' ? 0.035 : sensitivity === 'low' ? 0.012 : 0.022;
    this.smoother = new Point2DSmoother(1.0, beta);
  }

  public getStatus(): TrackerStatus {
    return this.status;
  }

  public getLastPoint(): Point2D | null {
    return this.lastPoint;
  }

  public getLastVelocity(): Vector2D {
    return this.lastVelocity;
  }

  private setStatus(status: TrackerStatus, error?: string): void {
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status, error);
    }
  }

  /**
   * Initializes MediaPipe HandLandmarker with GPU first and fast CPU fallback
   */
  public async init(): Promise<boolean> {
    if (this.landmarker) return true;
    this.isCleanedUp = false;
    this.setStatus('loading');

    // forVisionTasks only builds paths; the wasm is actually fetched in createFromOptions,
    // so a missing local runtime only surfaces there. Try local, then CDN, each GPU then CPU.
    const wasmSources = ['/wasm', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'];
    const modelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
    let lastError: unknown = null;

    try {
      for (const wasmPath of wasmSources) {
        const vision = await FilesetResolver.forVisionTasks(wasmPath);
        for (const delegate of ['GPU', 'CPU'] as const) {
          if (this.isCleanedUp) return false;
          try {
            this.landmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate,
              },
              runningMode: 'VIDEO',
              numHands: 1,
              minHandDetectionConfidence: 0.45,
              minHandPresenceConfidence: 0.45,
              minTrackingConfidence: 0.45,
            });
            break;
          } catch (e) {
            lastError = e;
            console.warn(`[HandTracker] Failed to load (${wasmPath}, ${delegate}):`, e);
          }
        }
        if (this.landmarker) break;
      }

      if (!this.landmarker) {
        throw lastError instanceof Error ? lastError : new Error('Hand landmarker failed to load');
      }

      if (this.isCleanedUp) {
        this.landmarker.close();
        this.landmarker = null;
        return false;
      }

      this.setStatus('ready');
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('[HandTracker] Initialization error:', error);
      this.setStatus('error', `Hand tracker failed to load (${error.message || 'Network/Model'}). Touch / mouse blade is active!`);
      return false;
    }
  }

  /**
   * Predicts fingertip position between camera frames using dead-reckoning velocity extrapolation
   */
  public predictCurrentPosition(currentTime: number): Point2D | null {
    if (!this.lastPoint || this.lastTimestamp <= 0) return null;
    const dt = (currentTime - this.lastTimestamp) / 1000;
    if (dt > 0.15) return this.lastPoint; // Don't extrapolate stale positions

    // Damped velocity extrapolation
    const damping = Math.max(0, 1 - dt * 4.0);
    return {
      x: Math.max(0, Math.min(this.options.canvasWidth, this.lastPoint.x + this.lastVelocity.x * dt * damping)),
      y: Math.max(0, Math.min(this.options.canvasHeight, this.lastPoint.y + this.lastVelocity.y * dt * damping)),
    };
  }

  /**
   * Processes a video frame using MediaPipe HandLandmarker with throttling
   */
  public processVideoFrame(video: HTMLVideoElement, timestamp: number): Point2D | null {
    if (!this.landmarker || this.isProcessing) return null;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const now = performance.now();
    if (now - this.lastInferenceTime < this.minInferenceInterval) {
      return null;
    }

    this.isProcessing = true;
    this.lastInferenceTime = now;

    try {
      // MediaPipe requires monotonically increasing integer timestamp
      const integerTimestamp = Math.max(Math.floor(this.lastTimestamp + 1), Math.floor(timestamp));
      const results = this.landmarker.detectForVideo(video, integerTimestamp);
      this.isProcessing = false;

      if (results.landmarks && results.landmarks.length > 0 && results.landmarks[0].length > 8) {
        // Landmark 8 is index fingertip
        const rawLandmark = results.landmarks[0][8];

        // Map to canvas
        const canvasPoint = CoordinateMapper.mapLandmarkToCanvas(rawLandmark.x, rawLandmark.y, {
          canvasWidth: this.options.canvasWidth,
          canvasHeight: this.options.canvasHeight,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          mirrored: this.options.mirrored,
        });

        // Apply One Euro smoothing
        const smoothed = this.smoother.filter(canvasPoint.x, canvasPoint.y, now);

        // Estimate velocity
        let velocity: Vector2D = { x: 0, y: 0 };
        if (this.lastPoint && this.lastTimestamp > 0) {
          const dt = Math.max(0.001, (now - this.lastTimestamp) / 1000);
          velocity = {
            x: (smoothed.x - this.lastPoint.x) / dt,
            y: (smoothed.y - this.lastPoint.y) / dt,
          };
        }

        this.lastPoint = smoothed;
        this.lastVelocity = velocity;
        this.lastTimestamp = now;
        this.lastTrackingTime = now;

        if (this.status !== 'tracking') {
          this.setStatus('tracking');
        }

        if (this.callbacks.onFingertipMove) {
          this.callbacks.onFingertipMove(smoothed, velocity, { x: rawLandmark.x, y: rawLandmark.y });
        }

        return smoothed;
      } else {
        // Hand loss tolerance check
        if (now - this.lastTrackingTime > this.trackingLostTimeout) {
          if (this.status === 'tracking') {
            this.setStatus('lost');
            this.lastPoint = null;
            this.lastVelocity = { x: 0, y: 0 };
            this.smoother.reset();
            if (this.callbacks.onTrackingLost) {
              this.callbacks.onTrackingLost();
            }
          }
        }
        return null;
      }
    } catch {
      this.isProcessing = false;
      return null;
    }
  }

  /**
   * Feeds mouse or touch cursor event into the tracking pipeline as fallback
   */
  public handlePointerInput(canvasX: number, canvasY: number, timestamp = performance.now()): void {
    const smoothed = this.smoother.filter(canvasX, canvasY, timestamp);

    let velocity: Vector2D = { x: 0, y: 0 };
    if (this.lastPoint && this.lastTimestamp > 0) {
      const dt = Math.max(0.001, (timestamp - this.lastTimestamp) / 1000);
      velocity = {
        x: (smoothed.x - this.lastPoint.x) / dt,
        y: (smoothed.y - this.lastPoint.y) / dt,
      };
    }

    this.lastPoint = smoothed;
    this.lastVelocity = velocity;
    this.lastTimestamp = timestamp;
    this.lastTrackingTime = timestamp;

    if (this.status !== 'tracking' && this.status !== 'fallback') {
      this.setStatus('fallback');
    }

    if (this.callbacks.onFingertipMove) {
      this.callbacks.onFingertipMove(smoothed, velocity);
    }
  }

  public handlePointerUp(): void {
    this.lastPoint = null;
    this.lastVelocity = { x: 0, y: 0 };
    this.smoother.reset();
    if (this.callbacks.onTrackingLost) {
      this.callbacks.onTrackingLost();
    }
  }

  public reset(): void {
    this.smoother.reset();
    this.lastPoint = null;
    this.lastVelocity = { x: 0, y: 0 };
    this.lastTimestamp = 0;
  }

  public dispose(): void {
    this.isCleanedUp = true;
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // Ignore close error
      }
      this.landmarker = null;
    }
    this.setStatus('idle');
  }
}
