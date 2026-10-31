import { Point2D } from '../types';

export interface CoordinateMapperOptions {
  canvasWidth: number;
  canvasHeight: number;
  videoWidth: number;
  videoHeight: number;
  mirrored?: boolean;
}

export class CoordinateMapper {
  /**
   * Maps normalized video coordinates [0..1, 0..1] to canvas pixel coordinates
   * applying aspect-ratio cover matching and optional horizontal mirroring.
   */
  public static mapLandmarkToCanvas(
    normalizedX: number,
    normalizedY: number,
    options: CoordinateMapperOptions,
    out?: Point2D
  ): Point2D {
    const { canvasWidth, canvasHeight, videoWidth, videoHeight, mirrored = true } = options;

    if (canvasWidth <= 0 || canvasHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
      const fallbackX = normalizedX * canvasWidth;
      const fallbackY = normalizedY * canvasHeight;
      if (out) {
        out.x = fallbackX;
        out.y = fallbackY;
        return out;
      }
      return { x: fallbackX, y: fallbackY };
    }

    // Mirror horizontally if requested
    const effectiveX = mirrored ? 1 - normalizedX : normalizedX;
    const effectiveY = normalizedY;

    // Aspect ratio matching ("cover" mode)
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let renderWidth = canvasWidth;
    let renderHeight = canvasHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > videoAspect) {
      // Canvas is wider than video: match width, crop vertical excess
      renderHeight = canvasWidth / videoAspect;
      offsetY = (canvasHeight - renderHeight) / 2;
    } else {
      // Canvas is taller than video: match height, crop horizontal excess
      renderWidth = canvasHeight * videoAspect;
      offsetX = (canvasWidth - renderWidth) / 2;
    }

    const canvasX = offsetX + effectiveX * renderWidth;
    const canvasY = offsetY + effectiveY * renderHeight;

    const finalX = Math.max(0, Math.min(canvasWidth, canvasX));
    const finalY = Math.max(0, Math.min(canvasHeight, canvasY));

    if (out) {
      out.x = finalX;
      out.y = finalY;
      return out;
    }

    return {
      x: finalX,
      y: finalY,
    };
  }
}
