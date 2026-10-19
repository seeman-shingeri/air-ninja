import { Bomb, Fruit, FruitHalf, Point2D, PopupText, SlicePoint, SpecialPower } from '../types';

export class GameRenderer {
  /**
   * Renders arena background with subtle ambiance
   */
  public static renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    activePowers: Record<SpecialPower, boolean>
  ): void {
    // Base arcade background gradient
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      50,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8
    );
    bgGrad.addColorStop(0, '#0d1527');
    bgGrad.addColorStop(1, '#050811');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle ninja dojo grid pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Special power screen vignettes
    if (activePowers.slow_motion) {
      ctx.save();
      const cyanGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.35,
        width / 2,
        height / 2,
        width * 0.75
      );
      cyanGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      cyanGrad.addColorStop(1, 'rgba(0, 229, 255, 0.22)');
      ctx.fillStyle = cyanGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (activePowers.double_score) {
      ctx.save();
      const goldGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.35,
        width / 2,
        height / 2,
        width * 0.75
      );
      goldGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
      goldGrad.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
      ctx.fillStyle = goldGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (activePowers.bomb_mode) {
      ctx.save();
      const redGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.35,
        width / 2,
        height / 2,
        width * 0.75
      );
      redGrad.addColorStop(0, 'rgba(255, 23, 68, 0)');
      redGrad.addColorStop(1, 'rgba(255, 23, 68, 0.25)');
      ctx.fillStyle = redGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  /**
   * Renders a whole fruit using rich procedural 2D canvas drawing
   */
  public static renderFruit(ctx: CanvasRenderingContext2D, fruit: Fruit): void {
    if (fruit.isSliced) return;

    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation);

    const r = fruit.radius;

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    switch (fruit.type) {
      case 'watermelon': {
        // Outer dark green rind
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Darker green wavy stripes
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1b5e20';
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * r * 0.5, Math.sin(angle) * r * 0.5, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'orange': {
        // Orange peel with radial gradient
        const peelGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
        peelGrad.addColorStop(0, '#ffb74d');
        peelGrad.addColorStop(1, '#e65100');
        ctx.fillStyle = peelGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Stem dot
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#4e342e';
        ctx.beginPath();
        ctx.arc(0, -r * 0.85, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'apple': {
        // Apple body
        const appleGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
        appleGrad.addColorStop(0, '#ff5252');
        appleGrad.addColorStop(0.8, '#d50000');
        appleGrad.addColorStop(1, '#8b0000');
        ctx.fillStyle = appleGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Apple stem
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.quadraticCurveTo(5, -r * 1.25, 3, -r * 1.35);
        ctx.stroke();

        // Small green leaf
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.ellipse(6, -r * 1.1, 7, 3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'banana': {
        // Curved banana body
        ctx.fillStyle = '#fbc02d';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.1, -0.4, Math.PI + 0.4, false);
        ctx.quadraticCurveTo(0, r * 0.3, r * 1.1 * Math.cos(-0.4), r * 1.1 * Math.sin(-0.4));
        ctx.fill();

        // Banana tips
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(-r * 0.95, 2, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'strawberry': {
        // Strawberry heart/triangle shape
        ctx.fillStyle = '#d81b60';
        ctx.beginPath();
        ctx.moveTo(0, r * 1.1);
        ctx.bezierCurveTo(-r * 1.2, r * 0.2, -r * 1.1, -r * 0.8, 0, -r * 0.7);
        ctx.bezierCurveTo(r * 1.1, -r * 0.8, r * 1.2, r * 0.2, 0, r * 1.1);
        ctx.fill();

        // Seed dots
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff59d';
        const seedOffsets = [
          [-8, -8], [0, -12], [8, -8],
          [-10, 0], [0, -2], [10, 0],
          [-5, 10], [5, 10], [0, 18],
        ];
        seedOffsets.forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.ellipse(sx * (r / 28), sy * (r / 28), 1.5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Green leaf cap
        ctx.fillStyle = '#388e3c';
        ctx.beginPath();
        ctx.ellipse(-8, -r * 0.75, 7, 3.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(0, -r * 0.85, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(8, -r * 0.75, 7, 3.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pineapple': {
        // Golden pineapple body with diamond texture
        const pineGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
        pineGrad.addColorStop(0, '#fbc02d');
        pineGrad.addColorStop(1, '#e65100');
        ctx.fillStyle = pineGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cross-hatching scales
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#bf360c';
        ctx.lineWidth = 1.8;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.6, i * 16 - 15);
          ctx.lineTo(r * 0.6, i * 16 + 15);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-r * 0.6, i * 16 + 15);
          ctx.lineTo(r * 0.6, i * 16 - 15);
          ctx.stroke();
        }

        // Green spiky crown
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.4);
        ctx.lineTo(-r * 0.4, -r * 0.9);
        ctx.lineTo(0, -r * 0.8);
        ctx.lineTo(r * 0.4, -r * 0.9);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    // 3D Specular sheen highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders a split fruit half with clean cut face and exposed seeds/pulp
   */
  public static renderFruitHalf(ctx: CanvasRenderingContext2D, half: FruitHalf): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, half.alpha));
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);

    const r = half.radius;

    // Cut half mask: draw semicircle
    ctx.beginPath();
    if (half.isLeft) {
      ctx.arc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
    } else {
      ctx.arc(0, 0, r, (3 * Math.PI) / 2, Math.PI / 2, false);
    }
    ctx.closePath();

    // Rind
    ctx.fillStyle = half.skinColor;
    ctx.fill();

    // Inner juicy pulp
    ctx.beginPath();
    if (half.isLeft) {
      ctx.arc(0, 0, r * 0.85, Math.PI / 2, (3 * Math.PI) / 2, false);
    } else {
      ctx.arc(0, 0, r * 0.85, (3 * Math.PI) / 2, Math.PI / 2, false);
    }
    ctx.closePath();
    ctx.fillStyle = half.pulpColor;
    ctx.fill();

    // Cut face highlight edge
    ctx.strokeStyle = half.innerColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();

    // Exposed seeds along cut
    if (half.type === 'watermelon') {
      ctx.fillStyle = '#212121';
      const dir = half.isLeft ? -1 : 1;
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        ctx.ellipse(dir * (r * 0.4), s * (r * 0.28), 2.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (half.type === 'orange') {
      ctx.fillStyle = '#fff9c4';
      const dir = half.isLeft ? -1 : 1;
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        ctx.arc(dir * (r * 0.35), s * (r * 0.3), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Renders bomb with sparkling fuse and metallic shading
   */
  public static renderBomb(ctx: CanvasRenderingContext2D, bomb: Bomb): void {
    if (bomb.isDetonated) return;

    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rotation);

    const r = bomb.radius;

    // Outer bomb shadow
    ctx.shadowColor = 'rgba(255, 23, 68, 0.4)';
    ctx.shadowBlur = 14;

    // Metallic body gradient
    const metalGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    metalGrad.addColorStop(0, '#546e7a');
    metalGrad.addColorStop(0.6, '#263238');
    metalGrad.addColorStop(1, '#000a12');

    ctx.fillStyle = metalGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Brass bomb collar
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.rect(-r * 0.25, -r * 1.15, r * 0.5, r * 0.25);
    ctx.fill();

    // Woven rope fuse
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.quadraticCurveTo(12, -r * 1.5, 6, -r * 1.7);
    ctx.stroke();

    // Sizzling spark at tip of fuse
    const fuseTipX = 6;
    const fuseTipY = -r * 1.7;
    const sparkPulse = 4 + Math.sin(bomb.fuseTimer * 20) * 2;
    ctx.shadowColor = '#ff3d00';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(fuseTipX, fuseTipY, sparkPulse, 0, Math.PI * 2);
    ctx.fill();

    // Danger hazard skull / crossbones emblem
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(0, -3, 8, 0, Math.PI * 2); // skull head
    ctx.fill();

    ctx.beginPath();
    ctx.rect(-4, 3, 8, 5); // skull jaw
    ctx.fill();

    // Eye sockets
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(-3, -3, 2, 0, Math.PI * 2);
    ctx.arc(3, -3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders glowing blade trail with ultra-smooth quadratic curved ribbon
   */
  public static renderBladeTrail(
    ctx: CanvasRenderingContext2D,
    trail: SlicePoint[],
    maxAge: number
  ): void {
    if (trail.length < 2) return;

    ctx.save();
    const now = performance.now();
    const pts = trail.filter((p) => (now - p.timestamp) / 1000 <= maxAge);
    if (pts.length < 2) {
      ctx.restore();
      return;
    }

    for (let i = 1; i < pts.length; i++) {
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const age = (now - p2.timestamp) / 1000;
      const progress = Math.max(0, Math.min(1, 1 - age / maxAge));
      const width = Math.max(2, progress * 16);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      if (i < pts.length - 1) {
        const p3 = pts[i + 1];
        const midX = (p2.x + p3.x) / 2;
        const midY = (p2.y + p3.y) / 2;
        ctx.quadraticCurveTo(p2.x, p2.y, midX, midY);
      } else {
        ctx.lineTo(p2.x, p2.y);
      }

      // Outer neon cyan/violet glow
      ctx.strokeStyle = `rgba(0, 229, 255, ${progress * 0.9})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12 * progress;
      ctx.stroke();

      // Sharp luminous white core
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.95})`;
      ctx.lineWidth = Math.max(1, width * 0.35);
      ctx.shadowBlur = 4;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders fingertip cursor crosshair
   */
  public static renderFingertipCursor(
    ctx: CanvasRenderingContext2D,
    point: Point2D | null,
    isHandDetected: boolean
  ): void {
    if (!point) return;

    ctx.save();
    ctx.translate(point.x, point.y);

    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.15;
    const color = isHandDetected ? '#00e5ff' : '#76ff03';

    // Outer reticle ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Four blade crosshairs
    const len = 7;
    const dist = 18 * pulse;
    ctx.beginPath();
    ctx.moveTo(0, -dist);
    ctx.lineTo(0, -dist - len);
    ctx.moveTo(0, dist);
    ctx.lineTo(0, dist + len);
    ctx.moveTo(-dist, 0);
    ctx.lineTo(-dist - len, 0);
    ctx.moveTo(dist, 0);
    ctx.lineTo(dist + len, 0);
    ctx.stroke();

    // Inner glowing core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders animated score and combo popup text
   */
  public static renderPopups(
    ctx: CanvasRenderingContext2D,
    popups: PopupText[],
    currentTime: number
  ): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 24px "Orbitron", "Rajdhani", sans-serif';

    for (const pop of popups) {
      const elapsed = (currentTime - pop.createdAt) / 1000;
      if (elapsed > pop.lifetime) continue;

      const progress = elapsed / pop.lifetime;
      const alpha = Math.max(0, 1 - progress);
      const yOffset = progress * 40;
      const scale = pop.scale * (1 + Math.sin(progress * Math.PI) * 0.2);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pop.x, pop.y - yOffset);
      ctx.scale(scale, scale);

      ctx.fillStyle = pop.color;
      ctx.shadowColor = pop.color;
      ctx.shadowBlur = 8;
      ctx.fillText(pop.text, 0, 0);

      ctx.restore();
    }
    ctx.restore();
  }
}
