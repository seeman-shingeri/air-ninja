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
  private lastTimestamp = 0;
  private isProcessing = false;
  private trackingLostTimeout = 250; // ms grace period before declaring hand lost
  private isCleanedUp = false;

  constructor(options: HandTrackerOptions, callbacks: HandTrackerCallbacks = {}) {
    this.options = { mirrored: true, sensitivity: 'medium', ...options };
    this.callbacks = callbacks;

    const beta = options.sensitivity === 'high' ? 0.025 : options.sensitivity === 'low' ? 0.006 : 0.012;
    this.smoother = new Point2DSmoother(1.2, beta);
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
    const beta = sensitivity === 'high' ? 0.025 : sensitivity === 'low' ? 0.006 : 0.012;
    this.smoother = new Point2DSmoother(1.2, beta);
  }

  public getStatus(): TrackerStatus {
    return this.status;
  }

  private setStatus(status: TrackerStatus, error?: string): void {
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status, error);
    }
  }

  /**
   * Initializes MediaPipe HandLandmarker with local wasm and model asset fallback
   */
  public async init(): Promise<boolean> {
    if (this.landmarker) return true;
    this.isCleanedUp = false;
    this.setStatus('loading');

    try {
      // 1. Resolve vision tasks wasm (try local first, fallback to CDN)
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch (e) {
        console.warn('[HandTracker] Local wasm failed, trying CDN fallback:', e);
        vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm');
      }

      if (this.isCleanedUp) return false;

      // 2. Load hand landmarker model
      const modelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

      try {
        // Try GPU first
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuError) {
        console.warn('[HandTracker] GPU delegate failed, falling back to CPU:', gpuError);
        // Fallback to CPU
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
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
      console.warn('[HandTracker] Hand landmarker initialization failed:', error);
      this.setStatus('error', `Hand tracker could not be loaded (${error.message || 'Network/Model error'}). Mouse/touch blade is available!`);
      return false;
    }
  }

  /**
   * Processes a video frame using MediaPipe HandLandmarker
   */
  public processVideoFrame(video: HTMLVideoElement, timestamp: number): Point2D | null {
    if (!this.landmarker || this.isProcessing) return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;

    this.isProcessing = true;

    try {
      const results = this.landmarker.detectForVideo(video, timestamp);
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
        const smoothed = this.smoother.filter(canvasPoint.x, canvasPoint.y, timestamp);

        // Estimate velocity
        let velocity: Vector2D = { x: 0, y: 0 };
        if (this.lastPoint && this.lastTimestamp > 0) {
          const dt = Math.max(0.001, (timestamp - this.lastTimestamp) / 1000);
          velocity = {
            x: (smoothed.x - this.lastPoint.x) / dt,
            y: (smoothed.y - this.lastPoint.y) / dt,
          };
        }

        this.lastPoint = smoothed;
        this.lastTimestamp = timestamp;
        this.lastTrackingTime = performance.now();

        if (this.status !== 'tracking') {
          this.setStatus('tracking');
        }

        if (this.callbacks.onFingertipMove) {
          this.callbacks.onFingertipMove(smoothed, velocity, { x: rawLandmark.x, y: rawLandmark.y });
        }

        return smoothed;
      } else {
        // Check for hand loss tolerance
        const now = performance.now();
        if (now - this.lastTrackingTime > this.trackingLostTimeout) {
          if (this.status === 'tracking') {
            this.setStatus('lost');
            this.lastPoint = null;
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
    this.smoother.reset();
    if (this.callbacks.onTrackingLost) {
      this.callbacks.onTrackingLost();
    }
  }

  public reset(): void {
    this.smoother.reset();
    this.lastPoint = null;
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
