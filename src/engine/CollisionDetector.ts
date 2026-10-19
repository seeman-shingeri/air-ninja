import { Point2D, Fruit, Bomb } from '../types';

export interface SliceHit {
  hit: boolean;
  sliceAngle: number;
  hitPoint: Point2D;
  distance: number;
}

export class CollisionDetector {
  /**
   * Tests whether a line segment from p1 to p2 intersects with a circle at (cx, cy) with radius r.
   */
  public static testSegmentCircle(
    p1: Point2D,
    p2: Point2D,
    cx: number,
    cy: number,
    radius: number
  ): SliceHit {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    let closestX: number;
    let closestY: number;

    if (lenSq === 0) {
      closestX = p1.x;
      closestY = p1.y;
    } else {
      // Project circle center onto segment
      const t = Math.max(0, Math.min(1, ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq));
      closestX = p1.x + t * dx;
      closestY = p1.y + t * dy;
    }

    const distSq = (closestX - cx) * (closestX - cx) + (closestY - cy) * (closestY - cy);
    const hit = distSq <= radius * radius;

    // Slice angle in radians
    const sliceAngle = Math.atan2(dy, dx);

    return {
      hit,
      sliceAngle,
      hitPoint: { x: closestX, y: closestY },
      distance: Math.sqrt(distSq),
    };
  }

  /**
   * Checks collision for an active fruit against the current swipe segment.
   * Ensures fruit cannot be sliced twice.
   */
  public static checkFruitSlice(
    fruit: Fruit,
    p1: Point2D,
    p2: Point2D,
    minDistanceThreshold = 8
  ): SliceHit {
    if (fruit.isSliced) {
      return { hit: false, sliceAngle: 0, hitPoint: { x: 0, y: 0 }, distance: Infinity };
    }

    // Require a minimal swipe length to prevent stationary cut glitches
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const moveDist = Math.sqrt(dx * dx + dy * dy);

    if (moveDist < minDistanceThreshold) {
      return { hit: false, sliceAngle: 0, hitPoint: { x: 0, y: 0 }, distance: Infinity };
    }

    return this.testSegmentCircle(p1, p2, fruit.x, fruit.y, fruit.radius);
  }

  /**
   * Checks collision for a bomb against the current swipe segment.
   */
  public static checkBombSlice(
    bomb: Bomb,
    p1: Point2D,
    p2: Point2D,
    minDistanceThreshold = 8
  ): SliceHit {
    if (bomb.isDetonated) {
      return { hit: false, sliceAngle: 0, hitPoint: { x: 0, y: 0 }, distance: Infinity };
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const moveDist = Math.sqrt(dx * dx + dy * dy);

    if (moveDist < minDistanceThreshold) {
      return { hit: false, sliceAngle: 0, hitPoint: { x: 0, y: 0 }, distance: Infinity };
    }

    return this.testSegmentCircle(p1, p2, bomb.x, bomb.y, bomb.radius);
  }
}
