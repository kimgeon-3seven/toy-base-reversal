import type Phaser from 'phaser';
import type { BattlefieldAudioDirector } from '../audio/BattlefieldAudioDirector';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import { TextButton } from './TextButton';
import { TOY_UI } from './ToyUiTheme';

type DragTarget = 'music' | 'effects' | null;

export class AudioControlPanel {
  private static readonly TRACK_START_X = 125;
  private static readonly TRACK_END_X = 305;
  private readonly toggleButton: TextButton;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly musicLabel: Phaser.GameObjects.Text;
  private readonly effectsLabel: Phaser.GameObjects.Text;
  private readonly musicKnob: Phaser.GameObjects.Arc;
  private readonly effectsKnob: Phaser.GameObjects.Arc;
  private readonly muteButton: TextButton;
  private dragTarget: DragTarget = null;
  private open = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly audio: BattlefieldAudioDirector,
  ) {
    this.toggleButton = new TextButton(
      scene,
      930,
      50,
      88,
      38,
      '♪ 소리',
      () => this.toggle(),
    );
    this.toggleButton.setDepth(145);

    const paper = scene.add
      .image(0, 0, IMAGE_ASSETS.paperTexture)
      .setOrigin(0)
      .setDisplaySize(350, 210)
      .setAlpha(0.99);
    const background = scene.add
      .rectangle(0, 0, 350, 210, TOY_UI.paper, 0.1)
      .setOrigin(0)
      .setStrokeStyle(3, TOY_UI.teal, 0.95)
      .setInteractive();
    background.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => event.stopPropagation(),
    );
    const title = scene.add.text(18, 15, '소리 설정', {
      color: '#0b615a',
      fontFamily: TOY_UI.fontFamily,
      fontSize: '20px',
      fontStyle: 'bold',
    });
    const closeButton = new TextButton(
      scene,
      316,
      25,
      48,
      30,
      '닫기',
      () => this.close(),
    );
    const musicTrack = this.createTrack(83, 'music');
    const effectsTrack = this.createTrack(132, 'effects');
    this.musicLabel = scene.add.text(18, 72, '', this.labelStyle());
    this.effectsLabel = scene.add.text(18, 121, '', this.labelStyle());
    this.musicKnob = this.createKnob(83, 'music');
    this.effectsKnob = this.createKnob(132, 'effects');
    this.muteButton = new TextButton(
      scene,
      175,
      177,
      190,
      36,
      '',
      () => {
        this.audio.toggleMute();
        this.sync();
      },
    );
    this.panel = scene.add
      .container(630, 92, [
        paper,
        background,
        title,
        closeButton.gameObject,
        musicTrack,
        effectsTrack,
        this.musicLabel,
        this.effectsLabel,
        this.musicKnob,
        this.effectsKnob,
        this.muteButton.gameObject,
      ])
      .setDepth(144)
      .setVisible(false);

    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.stopDragging, this);
    this.sync();
  }

  public close(): void {
    this.open = false;
    this.dragTarget = null;
    this.panel.setVisible(false);
    this.toggleButton.setLabel('♪ 소리');
  }

  public refresh(): void {
    this.sync();
  }

  private toggle(): void {
    this.audio.startMusic();
    this.open = !this.open;
    this.panel.setVisible(this.open);
    this.toggleButton.setLabel(this.open ? '× 닫기' : '♪ 소리');
    this.sync();
  }

  private createTrack(
    y: number,
    target: Exclude<DragTarget, null>,
  ): Phaser.GameObjects.Rectangle {
    const width =
      AudioControlPanel.TRACK_END_X - AudioControlPanel.TRACK_START_X;
    const track = this.scene.add
      .rectangle(
        AudioControlPanel.TRACK_START_X + width / 2,
        y,
        width,
        8,
        0xc7af82,
        1,
      )
      .setInteractive({ useHandCursor: true });
    track.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.dragTarget = target;
        this.updateFromPointer(pointer);
      },
    );
    return track;
  }

  private createKnob(
    y: number,
    target: Exclude<DragTarget, null>,
  ): Phaser.GameObjects.Arc {
    const knob = this.scene.add
      .circle(AudioControlPanel.TRACK_START_X, y, 10, TOY_UI.coral, 1)
      .setStrokeStyle(2, TOY_UI.coralDark, 1)
      .setInteractive({ useHandCursor: true });
    knob.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.dragTarget = target;
        this.updateFromPointer(pointer);
      },
    );
    return knob;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dragTarget === null || !pointer.isDown) return;
    this.updateFromPointer(pointer);
  }

  private stopDragging(): void {
    this.dragTarget = null;
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const localX = pointer.worldX - this.panel.x;
    const range =
      AudioControlPanel.TRACK_END_X - AudioControlPanel.TRACK_START_X;
    const volume = PhaserMath.clamp(
      (localX - AudioControlPanel.TRACK_START_X) / range,
      0,
      1,
    );
    if (this.dragTarget === 'music') this.audio.setMusicVolume(volume);
    else if (this.dragTarget === 'effects') this.audio.setEffectsVolume(volume);
    this.sync();
  }

  private sync(): void {
    const { musicVolume, effectsVolume, muted } = this.audio.settings;
    const range =
      AudioControlPanel.TRACK_END_X - AudioControlPanel.TRACK_START_X;
    this.musicLabel.setText(`BGM ${Math.round(musicVolume * 100)}%`);
    this.effectsLabel.setText(`효과음 ${Math.round(effectsVolume * 100)}%`);
    this.musicKnob.setX(AudioControlPanel.TRACK_START_X + range * musicVolume);
    this.effectsKnob.setX(
      AudioControlPanel.TRACK_START_X + range * effectsVolume,
    );
    this.muteButton.setLabel(muted ? '전체 소리 켜기' : '전체 음소거');
  }

  private labelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: TOY_UI.ink,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '16px',
    };
  }
}

const PhaserMath = {
  clamp(value: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(maximum, value));
  },
};
