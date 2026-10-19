import { DEFAULT_USER_SETTINGS } from '../config/gameConfig';
import { UserSettings } from '../types';

const SETTINGS_KEY = 'air_ninja_user_settings';

export class SettingsStorage {
  public static getSettings(): UserSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_USER_SETTINGS };

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_USER_SETTINGS };
      }

      return {
        sensitivity: ['low', 'medium', 'high'].includes(parsed.sensitivity)
          ? parsed.sensitivity
          : DEFAULT_USER_SETTINGS.sensitivity,
        mirrorCamera: typeof parsed.mirrorCamera === 'boolean'
          ? parsed.mirrorCamera
          : DEFAULT_USER_SETTINGS.mirrorCamera,
        soundVolume: typeof parsed.soundVolume === 'number' && parsed.soundVolume >= 0 && parsed.soundVolume <= 1
          ? parsed.soundVolume
          : DEFAULT_USER_SETTINGS.soundVolume,
        performanceMode: ['high', 'medium', 'low'].includes(parsed.performanceMode)
          ? parsed.performanceMode
          : DEFAULT_USER_SETTINGS.performanceMode,
        reducedMotion: typeof parsed.reducedMotion === 'boolean'
          ? parsed.reducedMotion
          : DEFAULT_USER_SETTINGS.reducedMotion,
        voiceEnabled: typeof parsed.voiceEnabled === 'boolean'
          ? parsed.voiceEnabled
          : DEFAULT_USER_SETTINGS.voiceEnabled,
        cameraEnabled: typeof parsed.cameraEnabled === 'boolean'
          ? parsed.cameraEnabled
          : DEFAULT_USER_SETTINGS.cameraEnabled,
      };
    } catch {
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  public static saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('[SettingsStorage] Failed to save settings:', err);
    }
  }

  public static resetSettings(): UserSettings {
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (err) {
      console.error('[SettingsStorage] Failed to reset settings:', err);
    }
    return { ...DEFAULT_USER_SETTINGS };
  }
}
