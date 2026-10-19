import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceManager } from '../voice/VoiceManager';
import { DEFAULT_USER_SETTINGS, POWER_CONFIGS } from '../config/gameConfig';
import { GameEngine } from '../engine/GameEngine';

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
}

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctxMethods = new Map<string, ReturnType<typeof vi.fn>>();
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop: string) => {
      if (prop === 'measureText') return () => ({ width: 50 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: vi.fn() });
      }
      if (typeof prop === 'string') {
        let fn = ctxMethods.get(prop);
        if (!fn) {
          fn = vi.fn();
          ctxMethods.set(prop, fn);
        }
        return fn;
      }
      return undefined;
    },
    set: () => true,
  });

  return {
    width,
    height,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height, right: width, bottom: height }),
  } as unknown as HTMLCanvasElement;
}

describe('VoiceManager and Power Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes speech transcripts by stripping punctuation and lowercasing', () => {
    expect(VoiceManager.normalizeTranscript('Slow Motion!')).toBe('slow motion');
    expect(VoiceManager.normalizeTranscript('  Double Score, please? ')).toBe('double score please');
    expect(VoiceManager.normalizeTranscript('BOMB MODE!!')).toBe('bomb mode');
    expect(VoiceManager.normalizeTranscript('Slow... mo?!')).toBe('slow mo');
  });

  it('matches exact voice commands', () => {
    expect(VoiceManager.matchCommand('Slow motion!')).toBe('slow_motion');
    expect(VoiceManager.matchCommand('Double score!')).toBe('double_score');
    expect(VoiceManager.matchCommand('Bomb mode!')).toBe('bomb_mode');
  });

  it('matches reliable aliases for voice commands', () => {
    expect(VoiceManager.matchCommand('slow mo')).toBe('slow_motion');
    expect(VoiceManager.matchCommand('double points')).toBe('double_score');
    expect(VoiceManager.matchCommand('more bombs')).toBe('bomb_mode');
  });

  it('ignores unrelated speech phrases', () => {
    expect(VoiceManager.matchCommand('hello world')).toBeNull();
    expect(VoiceManager.matchCommand('cut the fruit')).toBeNull();
    expect(VoiceManager.matchCommand('pause game')).toBeNull();
  });

  it('enforces cooldown suppression to prevent repeated power activations', () => {
    const onAction = vi.fn();
    const voice = new VoiceManager({ onAction });

    // First manual trigger succeeds
    const firstTrigger = voice.manualTrigger('slow_motion');
    expect(firstTrigger).toBe(true);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SLOW_MOTION', power: 'slow_motion' })
    );

    // Immediate second trigger must be suppressed by cooldown
    const secondTrigger = voice.manualTrigger('slow_motion');
    expect(secondTrigger).toBe(false);
    expect(voice.canTriggerPower('slow_motion')).toBe(false);
    expect(voice.getRemainingCooldown('slow_motion')).toBeGreaterThan(0);
  });

  it('verifies power configurations have positive duration and cooldown', () => {
    expect(POWER_CONFIGS.slow_motion.duration).toBeGreaterThan(0);
    expect(POWER_CONFIGS.slow_motion.cooldown).toBeGreaterThanOrEqual(POWER_CONFIGS.slow_motion.duration);

    expect(POWER_CONFIGS.double_score.duration).toBeGreaterThan(0);
    expect(POWER_CONFIGS.double_score.cooldown).toBeGreaterThanOrEqual(POWER_CONFIGS.double_score.duration);

    expect(POWER_CONFIGS.bomb_mode.duration).toBeGreaterThan(0);
    expect(POWER_CONFIGS.bomb_mode.cooldown).toBeGreaterThanOrEqual(POWER_CONFIGS.bomb_mode.duration);
  });

  // --- Voice Fruit Slicing & Low-Latency Tests ---

  it('supports exact and case-insensitive matching for all 8 required fruit names', () => {
    // All 8 required fruits: Apple, Banana, Orange, Watermelon, Pineapple, Strawberry, Mango, Grapes
    expect(VoiceManager.matchFruits('Apple')).toEqual(['apple']);
    expect(VoiceManager.matchFruits('banana')).toEqual(['banana']);
    expect(VoiceManager.matchFruits('ORANGE')).toEqual(['orange']);
    expect(VoiceManager.matchFruits('Watermelon')).toEqual(['watermelon']);
    expect(VoiceManager.matchFruits('pineapple')).toEqual(['pineapple']);
    expect(VoiceManager.matchFruits('Strawberry')).toEqual(['strawberry']);
    // Mango & Grapes mapped to existing game fruit types
    expect(VoiceManager.matchFruits('Mango')).toEqual(['orange']);
    expect(VoiceManager.matchFruits('grapes')).toEqual(['strawberry']);

    const entities = VoiceManager.matchFruitEntities('Mango and Grapes');
    expect(entities[0].spokenName).toBe('Mango');
    expect(entities[0].fruit).toBe('orange');
    expect(entities[1].spokenName).toBe('Grapes');
    expect(entities[1].fruit).toBe('strawberry');
  });

  it('matches fruit names inside supported natural phrases', () => {
    expect(VoiceManager.matchFruits('slice the apple please')).toEqual(['apple']);
    expect(VoiceManager.matchFruits('cut the watermelon right now')).toEqual(['watermelon']);
    expect(VoiceManager.matchFruits('quick get that banana')).toEqual(['banana']);
    expect(VoiceManager.matchFruits('can you slice pine apple')).toEqual(['pineapple']);
  });

  it('rejects unsupported words and avoids ambiguous partial matches', () => {
    // "snapple" should NOT match "apple"
    expect(VoiceManager.matchFruits('snapple')).toEqual([]);
    // "pineapple" should match pineapple, NOT apple
    expect(VoiceManager.matchFruits('pineapple')).toEqual(['pineapple']);
    // "grapefruit" should NOT match "grape"
    expect(VoiceManager.matchFruits('grapefruit')).toEqual([]);
    // Bombs or general words
    expect(VoiceManager.matchFruits('bomb mode')).toEqual([]);
    expect(VoiceManager.matchFruits('cut the bomb')).toEqual([]);
  });

  it('deduplicates interim and final results so each fruit is sliced once per utterance', () => {
    const onAction = vi.fn();
    const voice = new VoiceManager({ onAction });

    // Stream interim updates for utterance index 0
    voice.processTranscriptSegment(0, 'app', false);
    expect(onAction).not.toHaveBeenCalled();

    voice.processTranscriptSegment(0, 'apple', false);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'SLICE_FRUIT', fruitType: 'apple', spokenName: 'Apple' })
    );

    voice.processTranscriptSegment(0, 'apple ban', false);
    expect(onAction).toHaveBeenCalledTimes(1);

    voice.processTranscriptSegment(0, 'apple banana', false);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'SLICE_FRUIT', fruitType: 'banana', spokenName: 'Banana' })
    );

    // Final result for index 0 arrives: must NOT duplicate calls
    voice.processTranscriptSegment(0, 'apple banana', true);
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('allows repeated fruit-name utterances across distinct speech segments', () => {
    const onAction = vi.fn();
    const voice = new VoiceManager({ onAction });

    // Segment 0: "apple"
    voice.processTranscriptSegment(0, 'apple', true);
    expect(onAction).toHaveBeenCalledTimes(1);

    // Later Segment 1: player says "apple" again (after short deduplication window)
    vi.setSystemTime(Date.now() + 500);
    voice.processTranscriptSegment(1, 'apple', true);
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  // --- GameEngine Integration Tests ---

  it('slices an active matching fruit and awards points, but does not slice if fruit is unavailable', () => {
    const canvas = createMockCanvas(800, 600);
    const engine = new GameEngine(canvas, DEFAULT_USER_SETTINGS);
    engine.startRound('classic');

    // Manually add an active on-screen apple
    const fruitManager = (engine as unknown as { fruitManager: { fruits: unknown[] } }).fruitManager;
    const apple = {
      id: 'test_apple',
      type: 'apple',
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 36,
      rotation: 0,
      rotationSpeed: 0,
      isSliced: false,
      createdAt: performance.now(),
      points: 2,
    };
    fruitManager.fruits.push(apple);

    // 1. Voice command for apple should succeed
    const successResult = engine.dispatchVoiceAction({
      type: 'SLICE_FRUIT',
      fruitType: 'apple',
      spokenName: 'Apple',
      transcript: 'apple',
      timestamp: Date.now(),
    });

    expect(successResult.success).toBe(true);
    expect(successResult.message).toBe('APPLE SLICED BY VOICE');
    expect(apple.isSliced).toBe(true);
    expect(engine.getStats().score).toBe(2);

    // 2. Second voice command for apple when none is left should fail gracefully
    const failResult = engine.dispatchVoiceAction({
      type: 'SLICE_FRUIT',
      fruitType: 'apple',
      spokenName: 'Apple',
      transcript: 'apple',
      timestamp: Date.now(),
    });

    expect(failResult.success).toBe(false);
    expect(failResult.message).toBe('No apple available.');
    // Score should remain 2 (no points awarded)
    expect(engine.getStats().score).toBe(2);

    engine.dispose();
  });

  it('deterministically selects the fruit nearest to center when multiple matching fruits exist', () => {
    const canvas = createMockCanvas(800, 600);
    const engine = new GameEngine(canvas, DEFAULT_USER_SETTINGS);
    engine.startRound('classic');

    const fruitManager = (engine as unknown as { fruitManager: { fruits: unknown[] } }).fruitManager;
    // Screen center is (400, 300)
    const centerApple = {
      id: 'center_apple',
      type: 'apple',
      x: 410,
      y: 305, // very close to center
      radius: 36,
      isSliced: false,
      createdAt: performance.now(),
      points: 2,
    };
    const cornerApple = {
      id: 'corner_apple',
      type: 'apple',
      x: 50,
      y: 50, // far from center
      radius: 36,
      isSliced: false,
      createdAt: performance.now(),
      points: 2,
    };
    fruitManager.fruits.push(cornerApple, centerApple);

    const result = engine.dispatchVoiceAction({
      type: 'SLICE_FRUIT',
      fruitType: 'apple',
      spokenName: 'Apple',
      transcript: 'apple',
      timestamp: Date.now(),
    });

    expect(result.success).toBe(true);
    expect(centerApple.isSliced).toBe(true);
    expect(cornerApple.isSliced).toBe(false);

    engine.dispose();
  });

  it('never slices bombs when a fruit name is spoken', () => {
    const canvas = createMockCanvas(800, 600);
    const engine = new GameEngine(canvas, DEFAULT_USER_SETTINGS);
    engine.startRound('classic');

    const fruitManager = (engine as unknown as { fruitManager: { bombs: unknown[]; fruits: unknown[] } }).fruitManager;
    const testBomb = {
      id: 'test_bomb',
      x: 400,
      y: 300,
      radius: 40,
      isExploded: false,
    };
    fruitManager.bombs.push(testBomb);

    const result = engine.dispatchVoiceAction({
      type: 'SLICE_FRUIT',
      fruitType: 'watermelon',
      spokenName: 'Watermelon',
      transcript: 'watermelon',
      timestamp: Date.now(),
    });

    expect(result.success).toBe(false);
    expect(testBomb.isExploded).toBe(false);
    expect(engine.getStats().lives).toBe(3); // Lives untouched!

    engine.dispose();
  });

  it('rejects voice commands when the game is paused or over', () => {
    const canvas = createMockCanvas(800, 600);
    const engine = new GameEngine(canvas, DEFAULT_USER_SETTINGS);
    engine.startRound('classic');

    engine.pause();
    const pausedResult = engine.dispatchVoiceAction({
      type: 'SLOW_MOTION',
      transcript: 'slow motion',
      timestamp: Date.now(),
    });
    expect(pausedResult.success).toBe(false);
    expect(pausedResult.message).toBe('Game is paused');

    engine.resume();
    engine.gameOver();
    const gameOverResult = engine.dispatchVoiceAction({
      type: 'SLOW_MOTION',
      transcript: 'slow motion',
      timestamp: Date.now(),
    });
    expect(gameOverResult.success).toBe(false);
    expect(gameOverResult.message).toBe('Game not active');

    engine.dispose();
  });

  it('pauses and stops voice recognition cleanly with bounded lifecycle', () => {
    const voice = new VoiceManager();
    expect(voice.getStatus()).toBe('idle');

    // Pause while idle
    voice.pause();
    expect(voice.getStatus()).toBe('idle');

    // Stop cleans all state
    voice.stop();
    expect(voice.getStatus()).toBe('idle');
  });
});
