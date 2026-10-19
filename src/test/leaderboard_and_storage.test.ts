import { describe, it, expect, beforeEach } from 'vitest';
import { LeaderboardStorage } from '../storage/LeaderboardStorage';
import { SettingsStorage } from '../storage/SettingsStorage';
import { DEFAULT_USER_SETTINGS } from '../config/gameConfig';

// In-memory mock for localStorage in Node/Vitest environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('Leaderboard and Settings Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates leaderboard entries correctly', () => {
    const valid = {
      id: '1',
      nickname: 'Sensei',
      score: 150,
      mode: 'classic',
      maxCombo: 4,
      slices: 45,
      bombsHit: 1,
      date: new Date().toISOString(),
    };
    expect(LeaderboardStorage.isValidEntry(valid)).toBe(true);

    // Negative score
    expect(LeaderboardStorage.isValidEntry({ ...valid, score: -10 })).toBe(false);

    // NaN score
    expect(LeaderboardStorage.isValidEntry({ ...valid, score: NaN })).toBe(false);

    // Invalid mode
    expect(LeaderboardStorage.isValidEntry({ ...valid, mode: 'survival' })).toBe(false);

    // Missing field
    expect(LeaderboardStorage.isValidEntry({ id: '1', nickname: 'Test' })).toBe(false);
  });

  it('saves and sorts scores in descending order', () => {
    LeaderboardStorage.addScore('PlayerA', 50, 'classic', 2, 20, 0);
    LeaderboardStorage.addScore('PlayerB', 120, 'classic', 4, 45, 1);
    LeaderboardStorage.addScore('PlayerC', 80, 'classic', 3, 30, 0);

    const scores = LeaderboardStorage.getScores('classic');
    expect(scores.length).toBe(3);
    expect(scores[0].nickname).toBe('PlayerB');
    expect(scores[0].score).toBe(120);
    expect(scores[1].nickname).toBe('PlayerC');
    expect(scores[1].score).toBe(80);
    expect(scores[2].nickname).toBe('PlayerA');
    expect(scores[2].score).toBe(50);
  });

  it('recovers gracefully from corrupted localStorage data', () => {
    // Malformed JSON string
    localStorage.setItem('air_ninja_leaderboard_classic', '{ corrupted JSON ');
    const recovered1 = LeaderboardStorage.getScores('classic');
    expect(recovered1).toEqual([]);

    // Valid JSON but non-array
    localStorage.setItem('air_ninja_leaderboard_classic', JSON.stringify({ score: 100 }));
    const recovered2 = LeaderboardStorage.getScores('classic');
    expect(recovered2).toEqual([]);

    // Array with corrupted objects mixed in
    const mixed = [
      { id: '1', nickname: 'Good', score: 100, mode: 'classic', maxCombo: 2, slices: 20, bombsHit: 0, date: '2026-01-01' },
      { bad: 'data' },
      null,
    ];
    localStorage.setItem('air_ninja_leaderboard_classic', JSON.stringify(mixed));
    const recovered3 = LeaderboardStorage.getScores('classic');
    expect(recovered3.length).toBe(1);
    expect(recovered3[0].nickname).toBe('Good');
  });

  it('clears scores on demand', () => {
    LeaderboardStorage.addScore('Ninja', 100, 'timed', 3, 30, 0);
    expect(LeaderboardStorage.getScores('timed').length).toBe(1);

    LeaderboardStorage.clearScores('timed');
    expect(LeaderboardStorage.getScores('timed').length).toBe(0);
  });

  it('persists and resets user settings correctly', () => {
    const initial = SettingsStorage.getSettings();
    expect(initial).toEqual(DEFAULT_USER_SETTINGS);

    const modified = { ...initial, soundVolume: 0.4, sensitivity: 'high' as const };
    SettingsStorage.saveSettings(modified);

    const loaded = SettingsStorage.getSettings();
    expect(loaded.soundVolume).toBe(0.4);
    expect(loaded.sensitivity).toBe('high');

    const reset = SettingsStorage.resetSettings();
    expect(reset).toEqual(DEFAULT_USER_SETTINGS);
  });
});
