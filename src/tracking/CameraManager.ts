export type CameraStatus =
  | 'uninitialized'
  | 'requesting'
  | 'ready'
  | 'permission_denied'
  | 'not_found'
  | 'busy'
  | 'unsupported'
  | 'timeout'
  | 'error';

export interface CameraManagerOptions {
  onStatusChange?: (status: CameraStatus, errorMessage?: string) => void;
  videoElement?: HTMLVideoElement;
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private status: CameraStatus = 'uninitialized';
  private options: CameraManagerOptions;
  private isCleanedUp = false;

  constructor(options: CameraManagerOptions = {}) {
    this.options = options;
    if (options.videoElement) {
      this.video = options.videoElement;
    }
  }

  public getStatus(): CameraStatus {
    return this.status;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  private setStatus(status: CameraStatus, error?: string): void {
    this.status = status;
    if (this.options.onStatusChange) {
      this.options.onStatusChange(status, error);
    }
  }

  /**
   * Initializes webcam with robust error handling and timeout protection
   */
  public async startCamera(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('unsupported', 'Camera access (navigator.mediaDevices.getUserMedia) is not supported in this browser or context.');
      return false;
    }

    // Stop existing stream if any. stopCamera() marks the manager as cleaned up,
    // so the flag must be reset afterwards or the new stream is discarded on arrival
    this.stopCamera();
    this.isCleanedUp = false;

    this.setStatus('requesting');

    if (!this.video) {
      this.video = document.createElement('video');
    }

    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      // 10 second timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), 10000);
      });

      const mediaPromise = navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      const stream = await Promise.race([mediaPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      if (this.isCleanedUp) {
        // Cancelled during setup
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      this.stream = stream;
      this.video.srcObject = stream;

      // Await video metadata and play
      await new Promise<void>((resolve, reject) => {
        if (!this.video) return reject(new Error('Video element removed'));

        const onLoaded = () => {
          this.video?.removeEventListener('loadeddata', onLoaded);
          resolve();
        };

        if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
          resolve();
        } else {
          this.video.addEventListener('loadeddata', onLoaded);
          this.video.play().catch(reject);
        }
      });

      await this.video.play().catch(() => {
        // Autoplay policy fallback
      });

      this.setStatus('ready');
      return true;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      if (this.isCleanedUp) return false;

      let status: CameraStatus = 'error';
      let message = 'Failed to access camera.';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        status = 'permission_denied';
        message = 'Camera permission was denied. Please allow camera access in browser permissions or use mouse blade.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        status = 'not_found';
        message = 'No webcam was detected on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        status = 'busy';
        message = 'Webcam is currently in use by another application or blocked by system permissions.';
      } else if (error.message === 'CAMERA_TIMEOUT') {
        status = 'timeout';
        message = 'Camera initialization timed out. Please check your camera connection.';
      }

      this.setStatus(status, message);
      this.stopCamera();
      return false;
    }
  }

  /**
   * Stops all active tracks, clears srcObject, releases hardware
   */
  public stopCamera(): void {
    this.isCleanedUp = true;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    if (this.status === 'ready' || this.status === 'requesting') {
      this.setStatus('uninitialized');
    }
  }

  public isReady(): boolean {
    return (
      this.status === 'ready' &&
      this.video !== null &&
      this.video.readyState >= 2 &&
      this.video.videoWidth > 0
    );
  }
}
