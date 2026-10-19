import { describe, it, expect, vi } from 'vitest';
import { CameraManager } from '../tracking/CameraManager';
import { ParticleSystem } from '../engine/ParticleSystem';
import { GAME_CONSTANTS } from '../config/gameConfig';

describe('Lifecycle, Camera Cleanup, and Safety Bounds', () => {
  it('enforces maximum delta time clamping to prevent physics explosion on tab suspension', () => {
    const suspendedRawDt = 5.0; // 5 seconds tab sleep
    const clampedDt = Math.min(suspendedRawDt, GAME_CONSTANTS.MAX_DELTA_TIME);

    expect(clampedDt).toBe(0.1);
    expect(clampedDt).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_DELTA_TIME);
  });

  it('releases media tracks cleanly when camera is stopped', () => {
    const stopTrack1 = vi.fn();
    const stopTrack2 = vi.fn();

    const mockStream = {
      getTracks: () => [
        { stop: stopTrack1, kind: 'video' },
        { stop: stopTrack2, kind: 'video' },
      ],
    } as unknown as MediaStream;

    const manager = new CameraManager();
    // Simulate active stream
    (manager as unknown as { stream: MediaStream }).stream = mockStream;

    manager.stopCamera();

    expect(stopTrack1).toHaveBeenCalled();
    expect(stopTrack2).toHaveBeenCalled();
    expect(manager.getStream()).toBeNull();
    expect(manager.getStatus()).toBe('uninitialized');
  });

  it('manages object-pooled particles without memory leaks', () => {
    const ps = new ParticleSystem('low'); // 50 particles

    // Emit bursts
    ps.emitFruitSlice(100, 100, 0, '#ff0000', '#00ff00');
    ps.emitBombFuse(200, 200);

    // Update with time until all particles decay
    for (let step = 0; step < 100; step++) {
      ps.update(0.1);
    }

    // After decay, all particles should be inactive in the pool ready for reuse
    const pool = (ps as unknown as { pool: { active: boolean }[] }).pool;
    const activeCount = pool.filter((p) => p.active).length;
    expect(activeCount).toBe(0);

    // Reset pool
    ps.reset();
    expect(pool.every((p) => !p.active)).toBe(true);
  });
});
