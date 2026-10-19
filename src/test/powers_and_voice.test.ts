import { describe, it, expect, vi } from 'vitest';
import { VoiceManager } from '../voice/VoiceManager';
import { POWER_CONFIGS } from '../config/gameConfig';

describe('VoiceManager and Power Rules', () => {
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
    const onPowerTriggered = vi.fn();
    const voice = new VoiceManager({ onPowerTriggered });

    // First manual trigger succeeds
    const firstTrigger = voice.manualTrigger('slow_motion');
    expect(firstTrigger).toBe(true);
    expect(onPowerTriggered).toHaveBeenCalledWith('slow_motion', 'Manual Trigger');

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

  it('matches spoken fruit names, plurals and split words', () => {
    expect(VoiceManager.matchFruits('Watermelon!')).toEqual(['watermelon']);
    expect(VoiceManager.matchFruits('bananas')).toEqual(['banana']);
    expect(VoiceManager.matchFruits('water melon')).toEqual(['watermelon']);
    expect(VoiceManager.matchFruits('strawberries')).toEqual(['strawberry']);
  });

  it('prefers longer fruit names over contained ones', () => {
    expect(VoiceManager.matchFruits('pineapple')).toEqual(['pineapple']);
    expect(VoiceManager.matchFruits('pine apple')).toEqual(['pineapple']);
    expect(VoiceManager.matchFruits('melon')).toEqual(['watermelon']);
  });

  it('returns every fruit in spoken order and ignores non-fruit words', () => {
    expect(VoiceManager.matchFruits('apple orange apple')).toEqual(['apple', 'orange', 'apple']);
    expect(VoiceManager.matchFruits('slow motion')).toEqual([]);
    expect(VoiceManager.matchFruits('snapple grapes')).toEqual([]);
  });

  it('cuts each spoken fruit once even as interim results repeat', () => {
    const onFruitCalled = vi.fn();
    const voice = new VoiceManager({ onFruitCalled });

    // Interim results grow for the same result index
    voice.handleFruitTranscript(0, 'apple');
    voice.handleFruitTranscript(0, 'apple ban');
    voice.handleFruitTranscript(0, 'apple banana');
    voice.handleFruitTranscript(0, 'apple banana');
    expect(onFruitCalled.mock.calls.map((c) => c[0])).toEqual(['apple', 'banana']);

    // A new result index starts fresh
    voice.handleFruitTranscript(1, 'apple');
    expect(onFruitCalled.mock.calls.map((c) => c[0])).toEqual(['apple', 'banana', 'apple']);
  });
});
