import type {
  AudioSettingsRepository,
  AudioSettingsSnapshot,
} from '../../ports/AudioSettingsRepository';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const AUDIO_SETTINGS_STORAGE_KEY = 'toy-base-reversal.audio-settings.v1';

export class LocalStorageAudioSettingsRepository
  implements AudioSettingsRepository
{
  public constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = AUDIO_SETTINGS_STORAGE_KEY,
  ) {}

  public load(): AudioSettingsSnapshot | null {
    const serialized = this.storage.getItem(this.storageKey);
    if (serialized === null) return null;
    const parsed = JSON.parse(serialized) as Partial<AudioSettingsSnapshot>;
    if (
      typeof parsed.musicVolume !== 'number' ||
      typeof parsed.effectsVolume !== 'number' ||
      typeof parsed.muted !== 'boolean'
    ) {
      return null;
    }
    return {
      musicVolume: parsed.musicVolume,
      effectsVolume: parsed.effectsVolume,
      muted: parsed.muted,
    };
  }

  public save(settings: AudioSettingsSnapshot): void {
    this.storage.setItem(this.storageKey, JSON.stringify(settings));
  }
}
