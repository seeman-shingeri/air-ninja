import { FruitType, SpecialPower } from '../types';

export type VoiceActionType = 'SLOW_MOTION' | 'DOUBLE_SCORE' | 'BOMB_MODE' | 'SLICE_FRUIT';

export interface VoiceAction {
  type: VoiceActionType;
  power?: SpecialPower;
  fruitType?: FruitType;
  spokenName?: string;
  transcript: string;
  timestamp: number;
}

export interface VoiceActionResult {
  success: boolean;
  message: string;
  action?: VoiceAction;
}

export type VoiceStatus = 'listening' | 'reconnecting' | 'idle' | 'error' | 'unsupported' | 'permission_denied';

export interface VoiceManagerCallbacks {
  onAction?: (action: VoiceAction) => VoiceActionResult | void;
  onPowerTriggered?: (power: SpecialPower, recognizedText: string) => void;
  onFruitCalled?: (fruit: FruitType, spokenName: string, recognizedText: string) => void;
  onStatusChange?: (status: VoiceStatus, message?: string) => void;
  onInterimText?: (text: string) => void;
  onFeedback?: (message: string, success: boolean) => void;
}

// Browser SpeechRecognition interface typing
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

export interface SpokenFruitTarget {
  type: FruitType;
  canonicalName: string;
}

// Spoken fruit dictionary mapping spoken names, plurals, and mis-splits to active game fruit types.
// Mango and Grapes are mapped to existing citrus and berry fruit definitions to avoid duplicate fruit systems.
export const SPOKEN_FRUIT_MAP: Record<string, SpokenFruitTarget> = {
  // Apple
  apple: { type: 'apple', canonicalName: 'Apple' },
  apples: { type: 'apple', canonicalName: 'Apple' },

  // Banana
  banana: { type: 'banana', canonicalName: 'Banana' },
  bananas: { type: 'banana', canonicalName: 'Banana' },

  // Orange
  orange: { type: 'orange', canonicalName: 'Orange' },
  oranges: { type: 'orange', canonicalName: 'Orange' },

  // Watermelon
  watermelon: { type: 'watermelon', canonicalName: 'Watermelon' },
  watermelons: { type: 'watermelon', canonicalName: 'Watermelon' },
  'water melon': { type: 'watermelon', canonicalName: 'Watermelon' },
  'water melons': { type: 'watermelon', canonicalName: 'Watermelon' },
  melon: { type: 'watermelon', canonicalName: 'Watermelon' },
  melons: { type: 'watermelon', canonicalName: 'Watermelon' },

  // Pineapple
  pineapple: { type: 'pineapple', canonicalName: 'Pineapple' },
  pineapples: { type: 'pineapple', canonicalName: 'Pineapple' },
  'pine apple': { type: 'pineapple', canonicalName: 'Pineapple' },
  'pine apples': { type: 'pineapple', canonicalName: 'Pineapple' },

  // Strawberry
  strawberry: { type: 'strawberry', canonicalName: 'Strawberry' },
  strawberries: { type: 'strawberry', canonicalName: 'Strawberry' },
  'straw berry': { type: 'strawberry', canonicalName: 'Strawberry' },
  'straw berries': { type: 'strawberry', canonicalName: 'Strawberry' },

  // Mango (mapped to citrus orange in game)
  mango: { type: 'orange', canonicalName: 'Mango' },
  mangoes: { type: 'orange', canonicalName: 'Mango' },
  mangos: { type: 'orange', canonicalName: 'Mango' },

  // Grapes (mapped to berry strawberry in game)
  grape: { type: 'strawberry', canonicalName: 'Grapes' },
  grapes: { type: 'strawberry', canonicalName: 'Grapes' },
};

// Aliases lookup for test backward compatibility
export const FRUIT_VOICE_ALIASES: Record<FruitType, string[]> = {
  watermelon: ['watermelon', 'watermelons', 'water melon', 'water melons', 'melon', 'melons'],
  orange: ['orange', 'oranges', 'mango', 'mangoes', 'mangos'],
  apple: ['apple', 'apples'],
  banana: ['banana', 'bananas'],
  strawberry: ['strawberry', 'strawberries', 'straw berry', 'straw berries', 'grape', 'grapes'],
  pineapple: ['pineapple', 'pineapples', 'pine apple', 'pine apples'],
};

// Longest aliases first so "pine apple" wins over "apple" and "water melon" over "melon"
const SPOKEN_FRUIT_REGEX = new RegExp(
  `\\b(${Object.keys(SPOKEN_FRUIT_MAP)
    .sort((a, b) => b.length - a.length)
    .join('|')})\\b`,
  'gi'
);

export class VoiceManager {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private shouldRestart = false;
  private isPaused = false;
  private callbacks: VoiceManagerCallbacks;
  private status: VoiceStatus = 'idle';

  private lastTriggerTime: Record<SpecialPower, number> = {
    slow_motion: 0,
    double_score: 0,
    bomb_mode: 0,
  };
  private cooldownMs = 15000; // 15s cooldown per power

  // Bounded retry and backoff tracking
  private restartCount = 0;
  private readonly maxRestarts = 5;
  private restartTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly backoffBaseMs = 600;

  // Deduplication state across interim and final speech recognition results
  private handledFruitCount = new Map<number, number>();
  private handledPowers = new Map<number, Set<SpecialPower>>();
  private lastFruitSliceTime = new Map<string, number>();

  constructor(callbacks: VoiceManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Checks if browser supports Speech Recognition
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  /**
   * Normalizes spoken text by removing punctuation, extra spaces, and lowercasing
   */
  public static normalizeTranscript(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?!]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Matches normalized speech against known power commands with word-boundary accuracy
   */
  public static matchCommand(text: string): SpecialPower | null {
    const norm = this.normalizeTranscript(text);

    if (/\b(slow\s*motion|slow\s*mo)\b/i.test(norm)) {
      return 'slow_motion';
    }
    if (/\b(double\s*score|double\s*points)\b/i.test(norm)) {
      return 'double_score';
    }
    if (/\b(bomb\s*mode|more\s*bombs)\b/i.test(norm)) {
      return 'bomb_mode';
    }

    return null;
  }

  /**
   * Extracts every fruit entity with its spoken name and game FruitType in spoken order
   */
  public static matchFruitEntities(text: string): { fruit: FruitType; spokenName: string; index: number }[] {
    const norm = this.normalizeTranscript(text);
    const results: { fruit: FruitType; spokenName: string; index: number }[] = [];
    for (const match of norm.matchAll(SPOKEN_FRUIT_REGEX)) {
      const phrase = match[1].toLowerCase();
      const target = SPOKEN_FRUIT_MAP[phrase];
      if (target && match.index !== undefined) {
        results.push({
          fruit: target.type,
          spokenName: target.canonicalName,
          index: match.index,
        });
      }
    }
    return results;
  }

  /**
   * Extracts list of FruitTypes for backward test compatibility
   */
  public static matchFruits(text: string): FruitType[] {
    return this.matchFruitEntities(text).map((e) => e.fruit);
  }

  private setStatus(status: VoiceStatus, message?: string): void {
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status, message);
    }
  }

  public getStatus(): VoiceStatus {
    return this.status;
  }

  /**
   * Dispatches a validated voice action to the game engine
   */
  private dispatchAction(action: VoiceAction): void {
    if (this.callbacks.onAction) {
      const result = this.callbacks.onAction(action);
      if (result && this.callbacks.onFeedback) {
        this.callbacks.onFeedback(result.message, result.success);
      }
    }

    // Call individual legacy callbacks
    if (action.type === 'SLICE_FRUIT' && action.fruitType) {
      if (this.callbacks.onFruitCalled) {
        this.callbacks.onFruitCalled(action.fruitType, action.spokenName || action.fruitType, action.transcript);
      }
    } else if (action.power) {
      if (this.callbacks.onPowerTriggered) {
        this.callbacks.onPowerTriggered(action.power, action.transcript);
      }
    }
  }

  /**
   * Processes a single transcript segment for a given result index with robust deduplication
   */
  public processTranscriptSegment(resultIndex: number, transcript: string, isFinal = false): void {
    const now = Date.now();

    // 1. Check for Fruit Name commands
    const fruitEntities = VoiceManager.matchFruitEntities(transcript);
    const alreadyHandledCount = this.handledFruitCount.get(resultIndex) || 0;

    for (let j = alreadyHandledCount; j < fruitEntities.length; j++) {
      const entity = fruitEntities[j];
      const lastTime = this.lastFruitSliceTime.get(entity.fruit) || 0;

      // Deduplication window across rapid interim bursts (350ms)
      if (now - lastTime < 350) continue;

      this.lastFruitSliceTime.set(entity.fruit, now);

      const action: VoiceAction = {
        type: 'SLICE_FRUIT',
        fruitType: entity.fruit,
        spokenName: entity.spokenName,
        transcript,
        timestamp: now,
      };

      this.dispatchAction(action);
    }
    this.handledFruitCount.set(resultIndex, Math.max(alreadyHandledCount, fruitEntities.length));

    // 2. Check for Power commands
    const matchedPower = VoiceManager.matchCommand(transcript);
    if (matchedPower) {
      let handledSet = this.handledPowers.get(resultIndex);
      if (!handledSet) {
        handledSet = new Set<SpecialPower>();
        this.handledPowers.set(resultIndex, handledSet);
      }

      if (!handledSet.has(matchedPower)) {
        const lastPowerTime = this.lastTriggerTime[matchedPower] || 0;
        if (now - lastPowerTime >= this.cooldownMs) {
          handledSet.add(matchedPower);
          this.lastTriggerTime[matchedPower] = now;

          const actionType: VoiceActionType =
            matchedPower === 'slow_motion'
              ? 'SLOW_MOTION'
              : matchedPower === 'double_score'
              ? 'DOUBLE_SCORE'
              : 'BOMB_MODE';

          const action: VoiceAction = {
            type: actionType,
            power: matchedPower,
            transcript,
            timestamp: now,
          };

          this.dispatchAction(action);
        }
      }
    }

    // 3. Memory bounding: clean up old result indexes on final results
    if (isFinal) {
      for (const key of this.handledFruitCount.keys()) {
        if (key < resultIndex - 2) this.handledFruitCount.delete(key);
      }
      for (const key of this.handledPowers.keys()) {
        if (key < resultIndex - 2) this.handledPowers.delete(key);
      }
    }
  }

  /**
   * Emits fruit calls from a (possibly interim) recognition result (exposed for unit testing)
   */
  public handleFruitTranscript(resultIndex: number, transcript: string, isFinal = false): void {
    this.processTranscriptSegment(resultIndex, transcript, isFinal);
  }

  /**
   * Starts speech recognition session with single-session enforcement
   */
  public start(): boolean {
    if (!VoiceManager.isSupported()) {
      this.setStatus('unsupported', 'Web Speech API is not supported in this browser.');
      return false;
    }

    if (this.isListening && this.recognition) return true;

    this.shouldRestart = true;
    this.isPaused = false;
    return this.startRecognitionInstance();
  }

  private startRecognitionInstance(): boolean {
    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {
          // Ignore abort error on recreation
        }
        this.recognition = null;
      }

      const SpeechRecognitionConstructor =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        this.setStatus('unsupported');
        return false;
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this.isListening = true;
        this.restartCount = 0;
        this.setStatus('listening');
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (!transcript.trim()) continue;

          if (this.callbacks.onInterimText) {
            this.callbacks.onInterimText(transcript);
          }

          this.processTranscriptSegment(i, transcript, result.isFinal);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // 'no-speech' is normal when user is quiet
        if (event.error === 'no-speech') return;

        let message = `Voice error: ${event.error}`;
        if (event.error === 'not-allowed') {
          message = 'Microphone permission denied.';
          this.shouldRestart = false;
          this.setStatus('permission_denied', message);
          return;
        } else if (event.error === 'network') {
          message = 'Speech service network error (offline or unreachable).';
        }

        this.setStatus('error', message);
      };

      recognition.onend = () => {
        this.isListening = false;

        if (this.shouldRestart && !this.isPaused) {
          if (this.restartCount < this.maxRestarts) {
            const delay = Math.min(this.backoffBaseMs * Math.pow(1.5, this.restartCount), 3500);
            this.restartCount++;
            this.setStatus('reconnecting', `Reconnecting microphone (${this.restartCount}/${this.maxRestarts})...`);

            if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);
            this.restartTimeoutId = setTimeout(() => {
              if (this.shouldRestart && !this.isPaused) {
                this.startRecognitionInstance();
              }
            }, delay);
          } else {
            this.shouldRestart = false;
            this.setStatus('error', 'Microphone disconnected. Tap mic to retry.');
          }
        } else {
          this.setStatus('idle');
        }
      };

      this.recognition = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.warn('[VoiceManager] Failed to start speech recognition:', err);
      this.setStatus('error', 'Could not initialize speech recognition.');
      return false;
    }
  }

  /**
   * Temporarily pauses recognition when the game is paused
   */
  public pause(): void {
    this.isPaused = true;
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }
    this.isListening = false;
    this.setStatus('idle');
  }

  /**
   * Resumes recognition when the game resumes
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.restartCount = 0;
    this.start();
  }

  /**
   * Stops recognition and cleans up all resources
   */
  public stop(): void {
    this.shouldRestart = false;
    this.isPaused = false;
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
      this.recognition = null;
    }
    this.isListening = false;
    this.handledFruitCount.clear();
    this.handledPowers.clear();
    this.lastFruitSliceTime.clear();
    this.setStatus('idle');
  }

  public canTriggerPower(power: SpecialPower): boolean {
    const now = Date.now();
    return now - this.lastTriggerTime[power] >= this.cooldownMs;
  }

  public manualTrigger(power: SpecialPower): boolean {
    if (this.canTriggerPower(power)) {
      this.lastTriggerTime[power] = Date.now();
      const actionType: VoiceActionType =
        power === 'slow_motion'
          ? 'SLOW_MOTION'
          : power === 'double_score'
          ? 'DOUBLE_SCORE'
          : 'BOMB_MODE';

      const action: VoiceAction = {
        type: actionType,
        power,
        transcript: 'Manual Trigger',
        timestamp: Date.now(),
      };

      this.dispatchAction(action);
      return true;
    }
    return false;
  }

  public getRemainingCooldown(power: SpecialPower): number {
    const elapsed = Date.now() - this.lastTriggerTime[power];
    const rem = (this.cooldownMs - elapsed) / 1000;
    return rem > 0 ? rem : 0;
  }
}
