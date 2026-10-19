import { describe, it, expect } from 'vitest';
import { CollisionDetector } from '../engine/CollisionDetector';
import { Fruit, Bomb } from '../types';

describe('CollisionDetector', () => {
  it('detects a direct swipe crossing through a fruit', () => {
    // Circle at (100, 100) with radius 30
    const p1 = { x: 50, y: 100 };
    const p2 = { x: 150, y: 100 };

    const result = CollisionDetector.testSegmentCircle(p1, p2, 100, 100, 30);
    expect(result.hit).toBe(true);
    expect(result.hitPoint.x).toBeCloseTo(100);
    expect(result.hitPoint.y).toBeCloseTo(100);
    expect(result.distance).toBeCloseTo(0);
  });

  it('detects a glancing swipe touching the fruit radius', () => {
    // Circle at (100, 100) with radius 20. Segment passes at y = 115 (dist = 15 <= 20)
    const p1 = { x: 80, y: 115 };
    const p2 = { x: 120, y: 115 };

    const result = CollisionDetector.testSegmentCircle(p1, p2, 100, 100, 20);
    expect(result.hit).toBe(true);
    expect(result.distance).toBeCloseTo(15);
  });

  it('rejects a swipe that misses the fruit', () => {
    // Circle at (100, 100) with radius 20. Segment passes at y = 140 (dist = 40 > 20)
    const p1 = { x: 50, y: 140 };
    const p2 = { x: 150, y: 140 };

    const result = CollisionDetector.testSegmentCircle(p1, p2, 100, 100, 20);
    expect(result.hit).toBe(false);
    expect(result.distance).toBeGreaterThan(20);
  });

  it('calculates slice angle accurately for horizontal and diagonal cuts', () => {
    // Horizontal cut to the right (angle = 0)
    const hitH = CollisionDetector.testSegmentCircle({ x: 50, y: 100 }, { x: 150, y: 100 }, 100, 100, 30);
    expect(hitH.sliceAngle).toBeCloseTo(0);

    // Vertical cut downward (angle = PI / 2)
    const hitV = CollisionDetector.testSegmentCircle({ x: 100, y: 50 }, { x: 100, y: 150 }, 100, 100, 30);
    expect(hitV.sliceAngle).toBeCloseTo(Math.PI / 2);

    // 45-degree diagonal cut
    const hitD = CollisionDetector.testSegmentCircle({ x: 50, y: 50 }, { x: 150, y: 150 }, 100, 100, 30);
    expect(hitD.sliceAngle).toBeCloseTo(Math.PI / 4);
  });

  it('prevents duplicate slices on already-sliced fruits', () => {
    const fruit: Fruit = {
      id: 'f1',
      type: 'watermelon',
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 40,
      rotation: 0,
      rotationSpeed: 0,
      skinColor: '#000',
      pulpColor: '#fff',
      innerColor: '#fff',
      points: 2,
      isSliced: false,
      sliceAngle: 0,
      createdAt: Date.now(),
    };

    const p1 = { x: 50, y: 100 };
    const p2 = { x: 150, y: 100 };

    // First slice succeeds
    const firstHit = CollisionDetector.checkFruitSlice(fruit, p1, p2);
    expect(firstHit.hit).toBe(true);

    // Mark sliced
    fruit.isSliced = true;

    // Second slice must be rejected
    const secondHit = CollisionDetector.checkFruitSlice(fruit, p1, p2);
    expect(secondHit.hit).toBe(false);
  });

  it('rejects slices with movement below minimum distance threshold', () => {
    const fruit: Fruit = {
      id: 'f2',
      type: 'orange',
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 30,
      rotation: 0,
      rotationSpeed: 0,
      skinColor: '#000',
      pulpColor: '#fff',
      innerColor: '#fff',
      points: 2,
      isSliced: false,
      sliceAngle: 0,
      createdAt: Date.now(),
    };

    // Sub-threshold move (dist = 2px < 8px threshold)
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 102, y: 100 };

    const hit = CollisionDetector.checkFruitSlice(fruit, p1, p2, 8);
    expect(hit.hit).toBe(false);
  });

  it('detects bomb slice and prevents re-detonation', () => {
    const bomb: Bomb = {
      id: 'b1',
      x: 200,
      y: 200,
      vx: 0,
      vy: 0,
      radius: 35,
      rotation: 0,
      rotationSpeed: 0,
      fuseTimer: 0,
      isDetonated: false,
      createdAt: Date.now(),
    };

    const p1 = { x: 180, y: 200 };
    const p2 = { x: 220, y: 200 };

    const hit = CollisionDetector.checkBombSlice(bomb, p1, p2);
    expect(hit.hit).toBe(true);

    bomb.isDetonated = true;
    const secondHit = CollisionDetector.checkBombSlice(bomb, p1, p2);
    expect(secondHit.hit).toBe(false);
  });
});
