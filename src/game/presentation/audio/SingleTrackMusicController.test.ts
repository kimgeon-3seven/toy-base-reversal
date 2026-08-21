import { describe, expect, it } from 'vitest';
import type {
  MusicHandle,
  MusicInstancePool,
} from './SingleTrackMusicController';
import { SingleTrackMusicController } from './SingleTrackMusicController';

class FakeMusic implements MusicHandle {
  public isPlaying = false;
  public playCount = 0;
  public volume = 0;

  public play(): boolean {
    this.isPlaying = true;
    this.playCount += 1;
    return true;
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }
}

class FakePool implements MusicInstancePool {
  public readonly sounds: FakeMusic[] = [];
  public removed = 0;

  public list(): readonly FakeMusic[] {
    return this.sounds;
  }

  public create(): FakeMusic {
    const sound = new FakeMusic();
    this.sounds.push(sound);
    return sound;
  }

  public remove(sound: MusicHandle): void {
    const index = this.sounds.indexOf(sound as FakeMusic);
    if (index >= 0) this.sounds.splice(index, 1);
    this.removed += 1;
  }
}

describe('SingleTrackMusicController', () => {
  it('reuses the same playing music across controller recreation', () => {
    const pool = new FakePool();
    new SingleTrackMusicController(pool).start(0.2);
    new SingleTrackMusicController(pool).start(0.4);

    expect(pool.sounds).toHaveLength(1);
    expect(pool.sounds[0]?.playCount).toBe(1);
    expect(pool.sounds[0]?.volume).toBe(0.4);
  });

  it('removes duplicate music instances before playback continues', () => {
    const pool = new FakePool();
    pool.create();
    pool.create();

    new SingleTrackMusicController(pool).start(0.3);

    expect(pool.sounds).toHaveLength(1);
    expect(pool.removed).toBe(1);
  });
});
