export interface MusicHandle {
  readonly isPlaying: boolean;
  play(): boolean;
  setVolume(volume: number): unknown;
}

export interface MusicInstancePool {
  list(): readonly MusicHandle[];
  create(): MusicHandle;
  remove(sound: MusicHandle): void;
}

export class SingleTrackMusicController {
  private music: MusicHandle | null = null;

  public constructor(private readonly pool: MusicInstancePool) {}

  public start(volume: number): void {
    const existing = this.pool.list();
    this.music = existing[0] ?? this.music ?? this.pool.create();
    for (const duplicate of existing.slice(1)) this.pool.remove(duplicate);
    this.music.setVolume(volume);
    if (!this.music.isPlaying) this.music.play();
  }

  public setVolume(volume: number): void {
    this.music?.setVolume(volume);
  }
}
