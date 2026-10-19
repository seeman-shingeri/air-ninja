import { describe, it, expect, vi } from 'vitest';
import { FruitManager } from '../engine/FruitManager';
import { GAME_CONSTANTS } from '../config/gameConfig';

describe('FruitManager and Physics', () => {
  it('spawns fruits within configured screen boundaries with upward velocity', () => {
    const manager = new FruitManager();
    manager.setDimensions(1000, 800);

    const fruit = manager.spawnFruit('watermelon');
    expect(fruit.type).toBe('watermelon');
    // Spawned below screen bottom
    expect(fruit.y).toBeGreaterThan(800);
    // Spawned within horizontal margin (15% to 85% of 1000)
    expect(fruit.x).toBeGreaterThanOrEqual(150);
    expect(fruit.x).toBeLessThanOrEqual(850);
    // Initial vy is negative (directed upwards)
    expect(fruit.vy).toBeLessThan(0);
  });

  it('splits a sliced fruit into two halves with outward separating velocities', () => {
    const manager = new FruitManager();
    manager.setDimensions(800, 600);
    const fruit = manager.spawnFruit('orange');

    // Horizontal slice (angle = 0). Normal vector is along Y-axis (PI/2)
    const [half1, half2] = manager.sliceFruit(fruit, 0);

    expect(fruit.isSliced).toBe(true);
    expect(half1.isLeft).toBe(true);
    expect(half2.isLeft).toBe(false);
    expect(half1.type).toBe('orange');
    expect(half2.type).toBe('orange');

    // Velocities should be pushed in opposite directions along normal
    expect(half1.vy).not.toBe(half2.vy);
    expect(manager.slicedHalves.length).toBe(2);
  });

  it('updates physics using gravity over time delta', () => {
    const manager = new FruitManager();
    manager.setDimensions(800, 600);
    const fruit = manager.spawnFruit('apple');
    const initialVy = fruit.vy;
    const initialY = fruit.y;

    const dt = 0.05; // 50ms
    manager.update(dt, 'classic');

    // vy should increase (gravity accelerates downwards)
    expect(fruit.vy).toBeCloseTo(initialVy + GAME_CONSTANTS.GRAVITY * dt, 1);
    // y position should update
    expect(fruit.y).not.toBe(initialY);
  });

  it('triggers onFruitMissed when an unsliced fruit falls off the screen', () => {
    const onFruitMissed = vi.fn();
    const manager = new FruitManager({ onFruitMissed });
    manager.setDimensions(800, 600);

    const fruit = manager.spawnFruit('banana');
    // Force fruit to be below bottom and moving downwards
    fruit.y = 650;
    fruit.vy = 200;

    manager.update(0.1, 'classic');

    expect(onFruitMissed).toHaveBeenCalledWith(expect.objectContaining({ id: fruit.id }));
    expect(manager.fruits.length).toBe(0);
  });

  it('spawns bombs and tracks them in bomb array', () => {
    const manager = new FruitManager();
    manager.setDimensions(800, 600);

    const bomb = manager.spawnBomb();
    expect(bomb.radius).toBe(36);
    expect(bomb.isDetonated).toBe(false);
    expect(bomb.vy).toBeLessThan(0);
    expect(manager.bombs.length).toBe(1);
  });
});
