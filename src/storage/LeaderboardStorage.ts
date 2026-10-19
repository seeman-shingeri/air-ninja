import { GameMode, LeaderboardEntry } from '../types';

const LEADERBOARD_KEY_PREFIX = 'air_ninja_leaderboard_';

export class LeaderboardStorage {
  private static getKey(mode: GameMode): string {
    return `${LEADERBOARD_KEY_PREFIX}${mode}`;
  }

  /**
   * Validates whether an unknown object conforms to LeaderboardEntry
   */
  public static isValidEntry(entry: unknown): entry is LeaderboardEntry {
    if (!entry || typeof entry !== 'object') return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.id === 'string' &&
      typeof e.nickname === 'string' &&
      typeof e.score === 'number' &&
      !isNaN(e.score) &&
      e.score >= 0 &&
      (e.mode === 'classic' || e.mode === 'timed' || e.mode === 'endless') &&
      typeof e.maxCombo === 'number' &&
      typeof e.slices === 'number' &&
      typeof e.bombsHit === 'number' &&
      typeof e.date === 'string'
    );
  }

  /**
   * Retrieves high scores for a specific game mode, sorted by score descending
   */
  public static getScores(mode: GameMode): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(this.getKey(mode));
      if (!raw) return [];
      
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn(`[Leaderboard] Corrupted data for mode ${mode}, resetting.`);
        this.clearScores(mode);
        return [];
      }

      // Filter valid entries only
      const validEntries = parsed.filter(this.isValidEntry);
      
      // Sort descending by score, tiebreak by date
      validEntries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      return validEntries;
    } catch (err) {
      console.error(`[Leaderboard] Failed to parse scores for ${mode}:`, err);
      return [];
    }
  }

  /**
   * Adds a new score entry, keeps top 25 scores, returns rank (1-indexed) or -1 if not ranked
   */
  public static addScore(
    nickname: string,
    score: number,
    mode: GameMode,
    maxCombo: number,
    slices: number,
    bombsHit: number
  ): { rank: number; entries: LeaderboardEntry[] } {
    const cleanNick = (nickname || 'Ninja').trim().slice(0, 16);
    const newEntry: LeaderboardEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      nickname: cleanNick,
      score: Math.max(0, Math.floor(score)),
      mode,
      maxCombo,
      slices,
      bombsHit,
      date: new Date().toISOString(),
    };

    const current = this.getScores(mode);
    current.push(newEntry);
    current.sort((a, b) => b.score - a.score);

    // Keep top 25
    const trimmed = current.slice(0, 25);
    const rank = trimmed.findIndex((e) => e.id === newEntry.id) + 1;

    try {
      localStorage.setItem(this.getKey(mode), JSON.stringify(trimmed));
    } catch (err) {
      console.error('[Leaderboard] Failed to save score to localStorage:', err);
    }

    return { rank, entries: trimmed };
  }

  /**
   * Clears scores for a given mode or all modes
   */
  public static clearScores(mode?: GameMode): void {
    try {
      if (mode) {
        localStorage.removeItem(this.getKey(mode));
      } else {
        localStorage.removeItem(this.getKey('classic'));
        localStorage.removeItem(this.getKey('timed'));
        localStorage.removeItem(this.getKey('endless'));
      }
    } catch (err) {
      console.error('[Leaderboard] Failed to clear scores:', err);
    }
  }
}
