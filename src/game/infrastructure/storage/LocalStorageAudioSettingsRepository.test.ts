import { describe, expect, it } from 'vitest';
import { LocalStorageAudioSettingsRepository } from './LocalStorageAudioSettingsRepository';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('LocalStorageAudioSettingsRepository', () => {
  it('round-trips audio settings', () => {
    const repository = new LocalStorageAudioSettingsRepository(
      new MemoryStorage(),
      'test-audio',
    );
    const settings = {
      musicVolume: 0.4,
      effectsVolume: 0.75,
      muted: true,
    };

    repository.save(settings);

    expect(repository.load()).toEqual(settings);
  });

  it('rejects snapshots with missing fields', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-audio', JSON.stringify({ musicVolume: 0.4 }));
    const repository = new LocalStorageAudioSettingsRepository(
      storage,
      'test-audio',
    );

    expect(repository.load()).toBeNull();
  });
});
