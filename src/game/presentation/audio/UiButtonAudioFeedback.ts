import type Phaser from 'phaser';
import {
  UI_BUTTON_FEEDBACK_EVENT,
  type UiButtonFeedbackTone,
} from '../ui/UiButtonFeedbackEvent';

type AudibleUiButtonFeedbackTone = Exclude<UiButtonFeedbackTone, 'silent'>;
type UiButtonFeedbackListener = (tone: AudibleUiButtonFeedbackTone) => void;

export interface UiButtonFeedbackSource {
  subscribe(listener: UiButtonFeedbackListener): () => void;
}

export interface UiButtonSoundPlayer {
  playUi(tone: AudibleUiButtonFeedbackTone): void;
}

export class PhaserUiButtonFeedbackSource implements UiButtonFeedbackSource {
  public constructor(private readonly scene: Phaser.Scene) {}

  public subscribe(listener: UiButtonFeedbackListener): () => void {
    this.scene.events.on(UI_BUTTON_FEEDBACK_EVENT, listener);
    return () => this.scene.events.off(UI_BUTTON_FEEDBACK_EVENT, listener);
  }
}

export class UiButtonAudioFeedback {
  private unsubscribe: (() => void) | null = null;
  private lastPlayedAt = Number.NEGATIVE_INFINITY;

  public constructor(
    private readonly source: UiButtonFeedbackSource,
    private readonly soundPlayer: UiButtonSoundPlayer,
    private readonly now: () => number = () => Date.now(),
    private readonly throttleMs = 70,
  ) {}

  public start(): void {
    if (this.unsubscribe !== null) return;
    this.unsubscribe = this.source.subscribe((tone) => this.present(tone));
  }

  public stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.lastPlayedAt = Number.NEGATIVE_INFINITY;
  }

  private present(tone: AudibleUiButtonFeedbackTone): void {
    const currentTime = this.now();
    if (currentTime - this.lastPlayedAt < this.throttleMs) return;
    this.lastPlayedAt = currentTime;
    this.soundPlayer.playUi(tone);
  }
}
