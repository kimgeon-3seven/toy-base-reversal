import type {
  AudioSettingsRepository,
  AudioSettingsSnapshot,
} from '../ports/AudioSettingsRepository';

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsSnapshot = {
  musicVolume: 0.2,
  effectsVolume: 1,
  muted: false,
};

export class AudioSettingsService {
  private currentSettings: AudioSettingsSnapshot;

  public constructor(private readonly repository: AudioSettingsRepository) {
    this.currentSettings = this.loadSettings();
  }

  public get settings(): AudioSettingsSnapshot {
    return this.currentSettings;
  }

  public setMusicVolume(volume: number): AudioSettingsSnapshot {
    return this.update({ musicVolume: this.clampVolume(volume) });
  }

  public setEffectsVolume(volume: number): AudioSettingsSnapshot {
    return this.update({ effectsVolume: this.clampVolume(volume) });
  }

  public toggleMute(): AudioSettingsSnapshot {
    return this.update({ muted: !this.currentSettings.muted });
  }

  private loadSettings(): AudioSettingsSnapshot {
    try {
      const stored = this.repository.load();
      if (stored === null) return DEFAULT_AUDIO_SETTINGS;
      return {
        musicVolume: this.clampVolume(stored.musicVolume),
        effectsVolume: this.clampVolume(stored.effectsVolume),
        muted: stored.muted === true,
      };
    } catch {
      return DEFAULT_AUDIO_SETTINGS;
    }
  }

  private update(
    changed: Partial<AudioSettingsSnapshot>,
  ): AudioSettingsSnapshot {
    this.currentSettings = { ...this.currentSettings, ...changed };
    try {
      this.repository.save(this.currentSettings);
    } catch {
      // Storage can be unavailable in privacy modes. Session settings still work.
    }
    return this.currentSettings;
  }

  private clampVolume(volume: number): number {
    if (!Number.isFinite(volume)) return 0;
    return Math.min(1, Math.max(0, volume));
  }
}
