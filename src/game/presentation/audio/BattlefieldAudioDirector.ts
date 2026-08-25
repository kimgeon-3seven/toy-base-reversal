import type Phaser from 'phaser';
import type { AudioSettingsService } from '../../application/AudioSettingsService';
import type { CombatAttackStyle, CombatEvent } from '../../domain/combat/CombatEvent';
import type { AudioSettingsSnapshot } from '../../ports/AudioSettingsRepository';
import { AUDIO_ASSETS } from '../assets/GameAssets';
import {
  SingleTrackMusicController,
  type MusicHandle,
} from './SingleTrackMusicController';

const SHOT_SOUND: Readonly<Record<CombatAttackStyle, string>> = {
  popgun: AUDIO_ASSETS.shotPopgun,
  mortar: AUDIO_ASSETS.shotMortar,
  piercer: AUDIO_ASSETS.shotPiercer,
  unit: AUDIO_ASSETS.impactLight,
  commander: AUDIO_ASSETS.shotPiercer,
};

const TRANSIENT_AUDIO_ASSETS = Object.values(AUDIO_ASSETS).filter(
  (key) => key !== AUDIO_ASSETS.music,
);

export class BattlefieldAudioDirector {
  private readonly musicController: SingleTrackMusicController;
  private lastPlayedAt = new Map<string, number>();
  private pageSuspended = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly settingsService: AudioSettingsService,
  ) {
    this.musicController = new SingleTrackMusicController({
      list: () =>
        scene.sound
          .getAll(AUDIO_ASSETS.music)
          .map((sound) => new PhaserMusicHandle(sound)),
      create: () =>
        new PhaserMusicHandle(
          scene.sound.add(AUDIO_ASSETS.music, {
            loop: true,
          }),
        ),
      remove: (sound: MusicHandle) => {
        if (sound instanceof PhaserMusicHandle) {
          scene.sound.remove(sound.sound);
        }
      },
    });
    this.applyMute();
  }

  public get settings(): AudioSettingsSnapshot {
    return this.settingsService.settings;
  }

  public startMusic(): void {
    if (
      this.settings.muted ||
      this.pageSuspended ||
      !this.scene.cache.audio.exists(AUDIO_ASSETS.music)
    ) {
      return;
    }
    this.musicController.start(this.settings.musicVolume);
  }

  public suspendForPageActivity(): void {
    if (this.pageSuspended) return;
    this.pageSuspended = true;
    this.musicController.pause();
    for (const key of TRANSIENT_AUDIO_ASSETS) this.scene.sound.stopByKey(key);
    this.lastPlayedAt.clear();
  }

  public resumeAfterPageActivity(): void {
    if (!this.pageSuspended) return;
    this.pageSuspended = false;
    this.startMusic();
  }

  public toggleMute(): boolean {
    const settings = this.settingsService.toggleMute();
    this.applyMute();
    if (!settings.muted) this.startMusic();
    return settings.muted;
  }

  public setMusicVolume(volume: number): AudioSettingsSnapshot {
    const settings = this.settingsService.setMusicVolume(volume);
    this.musicController.setVolume(settings.musicVolume);
    if (!settings.muted) this.startMusic();
    return settings;
  }

  public setEffectsVolume(volume: number): AudioSettingsSnapshot {
    return this.settingsService.setEffectsVolume(volume);
  }

  public playUi(kind: 'click' | 'confirm' | 'error'): void {
    const key =
      kind === 'click'
        ? AUDIO_ASSETS.uiClick
        : kind === 'confirm'
          ? AUDIO_ASSETS.uiConfirm
          : AUDIO_ASSETS.uiError;
    this.playThrottled(key, 0.32, kind === 'error' ? 160 : 70);
  }

  public playAbility(kind: 'focus' | 'disrupt'): void {
    this.playThrottled(
      kind === 'focus' ? AUDIO_ASSETS.focusFire : AUDIO_ASSETS.disrupt,
      0.46,
      100,
    );
  }

  public present(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (event.type === 'attack') {
        this.playThrottled(SHOT_SOUND[event.style], event.style === 'mortar' ? 0.28 : 0.2, 55);
      } else if (event.type === 'destroyed') {
        this.playThrottled(
          event.targetKind === 'structure'
            ? AUDIO_ASSETS.structureBreak
            : AUDIO_ASSETS.impactHeavy,
          event.targetKind === 'structure' ? 0.5 : 0.34,
          120,
        );
      } else {
        this.playThrottled(AUDIO_ASSETS.coreHit, 0.5, 140);
      }
    }
  }

  private playThrottled(key: string, volume: number, throttleMs: number): void {
    if (
      this.pageSuspended ||
      this.settings.muted ||
      !this.scene.cache.audio.exists(key)
    ) {
      return;
    }
    const now = this.scene.time.now;
    if (now - (this.lastPlayedAt.get(key) ?? Number.NEGATIVE_INFINITY) < throttleMs) {
      return;
    }
    this.lastPlayedAt.set(key, now);
    this.scene.sound.play(key, {
      volume: volume * this.settings.effectsVolume,
    });
  }

  private applyMute(): void {
    this.scene.sound.mute = this.settings.muted;
  }
}

class PhaserMusicHandle implements MusicHandle {
  public constructor(public readonly sound: Phaser.Sound.BaseSound) {}

  public get isPlaying(): boolean {
    return this.sound.isPlaying;
  }

  public get isPaused(): boolean {
    return this.sound.isPaused;
  }

  public play(): boolean {
    return this.sound.play();
  }

  public pause(): boolean {
    return this.sound.pause();
  }

  public resume(): boolean {
    return this.sound.resume();
  }

  public setVolume(volume: number): unknown {
    const adjustableSound = this.sound as
      | Phaser.Sound.HTML5AudioSound
      | Phaser.Sound.WebAudioSound;
    return adjustableSound.setVolume(volume);
  }
}
