import type Phaser from 'phaser';
import type { CombatAttackStyle, CombatEvent } from '../../domain/combat/CombatEvent';
import { AUDIO_ASSETS } from '../assets/GameAssets';

const SHOT_SOUND: Readonly<Record<CombatAttackStyle, string>> = {
  popgun: AUDIO_ASSETS.shotPopgun,
  mortar: AUDIO_ASSETS.shotMortar,
  piercer: AUDIO_ASSETS.shotPiercer,
  unit: AUDIO_ASSETS.impactLight,
  commander: AUDIO_ASSETS.shotPiercer,
};

export class BattlefieldAudioDirector {
  private music: Phaser.Sound.BaseSound | null = null;
  private muted = false;
  private lastPlayedAt = new Map<string, number>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public startMusic(): void {
    if (this.music !== null || this.muted || !this.scene.cache.audio.exists(AUDIO_ASSETS.music)) {
      return;
    }
    this.music = this.scene.sound.add(AUDIO_ASSETS.music, {
      loop: true,
      volume: 0.2,
    });
    this.music.play();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    if (!this.muted) this.startMusic();
    return this.muted;
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
    if (this.muted || !this.scene.cache.audio.exists(key)) return;
    const now = this.scene.time.now;
    if (now - (this.lastPlayedAt.get(key) ?? Number.NEGATIVE_INFINITY) < throttleMs) {
      return;
    }
    this.lastPlayedAt.set(key, now);
    this.scene.sound.play(key, { volume });
  }
}
