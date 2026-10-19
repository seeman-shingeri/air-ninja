import { describe, it, expect } from 'vitest';
import { CoordinateMapper } from '../tracking/CoordinateMapper';
import { OneEuroFilter, Point2DSmoother } from '../tracking/OneEuroFilter';

describe('CoordinateMapper and OneEuroFilter', () => {
  it('maps center landmark (0.5, 0.5) to canvas center when aspect ratios match', () => {
    const point = CoordinateMapper.mapLandmarkToCanvas(0.5, 0.5, {
      canvasWidth: 800,
      canvasHeight: 600,
      videoWidth: 800,
      videoHeight: 600,
      mirrored: false,
    });

    expect(point.x).toBeCloseTo(400);
    expect(point.y).toBeCloseTo(300);
  });

  it('mirrors coordinates horizontally when mirrored is true', () => {
    // x = 0.2 in mirrored mode should map to effectiveX = 0.8 -> 800 * 0.8 = 640
    const point = CoordinateMapper.mapLandmarkToCanvas(0.2, 0.5, {
      canvasWidth: 800,
      canvasHeight: 600,
      videoWidth: 800,
      videoHeight: 600,
      mirrored: true,
    });

    expect(point.x).toBeCloseTo(640);
    expect(point.y).toBeCloseTo(300);
  });

  it('handles cover aspect ratio when canvas is wider than video feed', () => {
    // 16:9 canvas (1600x900) vs 4:3 video (640x480)
    const point = CoordinateMapper.mapLandmarkToCanvas(0.5, 0.5, {
      canvasWidth: 1600,
      canvasHeight: 900,
      videoWidth: 640,
      videoHeight: 480,
      mirrored: false,
    });

    // Center remains center
    expect(point.x).toBeCloseTo(800);
    expect(point.y).toBeCloseTo(450);
  });

  it('stabilizes quivering input with low-pass filtering at low velocity', () => {
    const filter = new OneEuroFilter(1.0, 0.01);
    let t = 1000;

    // Simulate noisy stationary point around 100 with alternating +/- 2 noise
    const outputs: number[] = [];
    for (let i = 0; i < 20; i++) {
      const noisyValue = 100 + (i % 2 === 0 ? 2 : -2);
      outputs.push(filter.filter(noisyValue, t));
      t += 33; // ~30fps
    }

    // The smoothed values should have significantly reduced jitter (< 1.5 variation)
    const lastOutput = outputs[outputs.length - 1];
    expect(Math.abs(lastOutput - 100)).toBeLessThan(1.5);
  });

  it('tracks rapid swipes with minimal lag when velocity is high', () => {
    const smoother = new Point2DSmoother(1.2, 0.02);
    let t = 1000;

    // Simulate high-speed swipe: jumping 100 pixels per frame
    smoother.filter(100, 100, t);
    t += 16;
    smoother.filter(200, 200, t);
    t += 16;
    const p2 = smoother.filter(300, 300, t);

    // Filter adapts cutoff frequency to keep pace with rapid movement
    expect(p2.x).toBeGreaterThan(250);
    expect(p2.y).toBeGreaterThan(250);
  });

  it('keeps a resting fingertip steady with the 2D smoother', () => {
    const smoother = new Point2DSmoother();
    let t = 1000;
    let out = { x: 0, y: 0 };
    for (let i = 0; i < 30; i++) {
      const n = i % 2 === 0 ? 3 : -3;
      out = smoother.filter(400 + n, 300 - n, t);
      t += 33;
    }
    expect(Math.abs(out.x - 400)).toBeLessThan(1.5);
    expect(Math.abs(out.y - 300)).toBeLessThan(1.5);
  });

  it('preserves the direction of diagonal swipes', () => {
    const smoother = new Point2DSmoother();
    let t = 1000;
    smoother.filter(100, 100, t);
    let out = { x: 100, y: 100 };
    // Uneven diagonal: x moves 3x faster than y
    for (let i = 1; i <= 6; i++) {
      t += 33;
      out = smoother.filter(100 + i * 60, 100 + i * 20, t);
    }
    const angle = Math.atan2(out.y - 100, out.x - 100);
    expect(angle).toBeCloseTo(Math.atan2(20, 60), 2);
  });

  it('catches up to a fast swipe within a few camera frames', () => {
    const smoother = new Point2DSmoother();
    let t = 1000;
    // Rest, then a 1500 px/s swipe sampled at 30 fps
    for (let i = 0; i < 10; i++) {
      smoother.filter(200, 200, t);
      t += 33;
    }
    let x = 200;
    let out = { x: 200, y: 200 };
    for (let i = 0; i < 3; i++) {
      x += 50;
      out = smoother.filter(x, 200, t);
      t += 33;
    }
    // Within 3 frames the blade trails the real fingertip by less than one frame of motion
    expect(x - out.x).toBeLessThan(50);
  });
});
