import { describe, expect, it } from 'vitest';
import type {
  AudioSettingsRepository,
  AudioSettingsSnapshot,
} from '../ports/AudioSettingsRepository';
import {
  AudioSettingsService,
  DEFAULT_AUDIO_SETTINGS,
} from './AudioSettingsService';

class MemoryAudioSettingsRepository implements AudioSettingsRepository {
  public saved: AudioSettingsSnapshot | null = null;

  public constructor(private readonly initial: AudioSettingsSnapshot | null) {}

  public load(): AudioSettingsSnapshot | null {
    return this.initial;
  }

  public save(settings: AudioSettingsSnapshot): void {
    this.saved = settings;
  }
}

describe('AudioSettingsService', () => {
  it('uses safe defaults when no settings have been saved', () => {
    const service = new AudioSettingsService(
      new MemoryAudioSettingsRepository(null),
    );
    expect(service.settings).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('clamps and persists independent music and effects volumes', () => {
    const repository = new MemoryAudioSettingsRepository(null);
    const service = new AudioSettingsService(repository);

    service.setMusicVolume(2);
    service.setEffectsVolume(-1);

    expect(service.settings).toMatchObject({
      musicVolume: 1,
      effectsVolume: 0,
    });
    expect(repository.saved).toEqual(service.settings);
  });

  it('preserves volume levels while toggling mute', () => {
    const service = new AudioSettingsService(
      new MemoryAudioSettingsRepository({
        musicVolume: 0.35,
        effectsVolume: 0.7,
        muted: false,
      }),
    );

    service.toggleMute();

    expect(service.settings).toEqual({
      musicVolume: 0.35,
      effectsVolume: 0.7,
      muted: true,
    });
  });
});
