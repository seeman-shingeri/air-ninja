import { FruitType, SpecialPower } from '../types';

export interface VoiceManagerCallbacks {
  onPowerTriggered?: (power: SpecialPower, recognizedText: string) => void;
  onFruitCalled?: (fruit: FruitType, recognizedText: string) => void;
  onStatusChange?: (status: 'listening' | 'idle' | 'error' | 'unsupported', message?: string) => void;
  onInterimText?: (text: string) => void;
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

// Spoken words that map to each fruit (plurals and common mis-splits from speech engines)
export const FRUIT_VOICE_ALIASES: Record<FruitType, string[]> = {
  watermelon: ['watermelon', 'watermelons', 'water melon', 'water melons', 'melon', 'melons'],
  orange: ['orange', 'oranges'],
  apple: ['apple', 'apples'],
  banana: ['banana', 'bananas'],
  strawberry: ['strawberry', 'strawberries', 'straw berry', 'straw berries'],
  pineapple: ['pineapple', 'pineapples', 'pine apple', 'pine apples'],
};

const FRUIT_ALIAS_LOOKUP = new Map<string, FruitType>();
(Object.keys(FRUIT_VOICE_ALIASES) as FruitType[]).forEach((fruit) => {
  FRUIT_VOICE_ALIASES[fruit].forEach((alias) => FRUIT_ALIAS_LOOKUP.set(alias, fruit));
});

// Longest aliases first so "pine apple" wins over "apple" and "water melon" over "melon"
const FRUIT_ALIAS_REGEX = new RegExp(
  `\\b(${[...FRUIT_ALIAS_LOOKUP.keys()].sort((a, b) => b.length - a.length).join('|')})\\b`,
  'g'
);

export class VoiceManager {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private shouldRestart = false;
  private callbacks: VoiceManagerCallbacks;
  private lastTriggerTime: Record<SpecialPower, number> = {
    slow_motion: 0,
    double_score: 0,
    bomb_mode: 0,
  };
  private cooldownMs = 15000; // 15s cooldown per power

  // Interim results repeat the same phrase as it grows, so track how many fruit
  // words of the current result were already acted on to avoid double cuts
  private fruitResultIndex = -1;
  private fruitMatchesHandled = 0;

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
   * Matches normalized speech against known power commands and reliable aliases
   */
  public static matchCommand(text: string): SpecialPower | null {
    const norm = this.normalizeTranscript(text);

    // Exact and alias matching
    if (
      norm === 'slow motion' ||
      norm === 'slow mo' ||
      norm === 'slowmotion' ||
      norm.includes('slow motion') ||
      norm.includes('slow mo')
    ) {
      return 'slow_motion';
    }

    if (
      norm === 'double score' ||
      norm === 'double points' ||
      norm === 'doublescore' ||
      norm.includes('double score') ||
      norm.includes('double points')
    ) {
      return 'double_score';
    }

    if (
      norm === 'bomb mode' ||
      norm === 'more bombs' ||
      norm === 'bombmode' ||
      norm.includes('bomb mode') ||
      norm.includes('more bombs')
    ) {
      return 'bomb_mode';
    }

    return null;
  }

  /**
   * Extracts every fruit name in a transcript, in spoken order ("apple and two bananas" -> apple, banana)
   */
  public static matchFruits(text: string): FruitType[] {
    const norm = this.normalizeTranscript(text);
    const matches: FruitType[] = [];
    for (const m of norm.matchAll(FRUIT_ALIAS_REGEX)) {
      const fruit = FRUIT_ALIAS_LOOKUP.get(m[1]);
      if (fruit) matches.push(fruit);
    }
    return matches;
  }

  /**
   * Emits fruit calls from a (possibly interim) recognition result, only for words not yet handled
   */
  public handleFruitTranscript(resultIndex: number, transcript: string): void {
    if (resultIndex !== this.fruitResultIndex) {
      this.fruitResultIndex = resultIndex;
      this.fruitMatchesHandled = 0;
    }

    const matches = VoiceManager.matchFruits(transcript);
    for (let i = this.fruitMatchesHandled; i < matches.length; i++) {
      if (this.callbacks.onFruitCalled) {
        this.callbacks.onFruitCalled(matches[i], transcript);
      }
    }
    this.fruitMatchesHandled = Math.max(this.fruitMatchesHandled, matches.length);
  }

  public start(): boolean {
    if (!VoiceManager.isSupported()) {
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('unsupported', 'Web Speech API is not supported in this browser.');
      }
      return false;
    }

    if (this.isListening) return true;

    try {
      const SpeechRecognitionConstructor =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('unsupported');
        }
        return false;
      }

      this.recognition = new SpeechRecognitionConstructor();
      this.fruitResultIndex = -1;
      this.fruitMatchesHandled = 0;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';

          if (this.callbacks.onInterimText) {
            this.callbacks.onInterimText(transcript);
          }

          this.handleFruitTranscript(i, transcript);

          const matchedPower = VoiceManager.matchCommand(transcript);
          if (matchedPower) {
            const now = Date.now();
            const lastTime = this.lastTriggerTime[matchedPower];
            if (now - lastTime >= this.cooldownMs) {
              this.lastTriggerTime[matchedPower] = now;
              if (this.callbacks.onPowerTriggered) {
                this.callbacks.onPowerTriggered(matchedPower, transcript);
              }
            }
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // 'no-speech' is normal when user is quiet; avoid alarming user
        if (event.error === 'no-speech') return;

        let message = `Voice error: ${event.error}`;
        if (event.error === 'not-allowed') {
          message = 'Microphone permission denied.';
          this.shouldRestart = false;
        } else if (event.error === 'network') {
          message = 'Speech service network error (offline or unreachable).';
        }

        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('error', message);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.shouldRestart) {
          // Restart to keep listening during gameplay
          try {
            this.recognition?.start();
          } catch {
            if (this.callbacks.onStatusChange) {
              this.callbacks.onStatusChange('idle');
            }
          }
        } else {
          if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange('idle');
          }
        }
      };

      this.shouldRestart = true;
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('[VoiceManager] Failed to start speech recognition:', err);
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange('error', 'Could not initialize speech recognition.');
      }
      return false;
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
      this.recognition = null;
    }
    this.isListening = false;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange('idle');
    }
  }

  public canTriggerPower(power: SpecialPower): boolean {
    const now = Date.now();
    return now - this.lastTriggerTime[power] >= this.cooldownMs;
  }

  public manualTrigger(power: SpecialPower): boolean {
    if (this.canTriggerPower(power)) {
      this.lastTriggerTime[power] = Date.now();
      if (this.callbacks.onPowerTriggered) {
        this.callbacks.onPowerTriggered(power, 'Manual Trigger');
      }
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
