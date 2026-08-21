import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import { TextButton } from './TextButton';

export interface PauseMenuActions {
  readonly pause: () => void;
  readonly resume: () => void;
  readonly exitToOpening: () => void;
}

export class PauseMenu {
  private readonly pauseButton: TextButton;
  private readonly overlay: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly resumeButton: TextButton;
  private readonly exitButton: TextButton;
  private readonly confirmExitButton: TextButton;
  private readonly cancelButton: TextButton;
  private pauseAvailable = false;

  public constructor(scene: Phaser.Scene, actions: PauseMenuActions) {
    this.pauseButton = new TextButton(
      scene,
      770,
      50,
      132,
      38,
      '일시정지',
      actions.pause,
    );
    this.pauseButton.setDepth(143);

    const backdrop = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x090712, 0.82)
      .setInteractive();
    backdrop.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => event.stopPropagation(),
    );
    const panel = scene.add
      .rectangle(0, 0, 560, 390, 0x262238, 1)
      .setStrokeStyle(3, 0xffd166, 0.95);
    this.title = scene.add
      .text(0, -132, '일시정지', {
        color: '#ffd166',
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.body = scene.add
      .text(0, -70, '전투와 모든 타이머가 멈췄습니다.', {
        align: 'center',
        color: '#f8f4e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        lineSpacing: 7,
        wordWrap: { width: 450 },
      })
      .setOrigin(0.5);
    this.resumeButton = new TextButton(
      scene,
      0,
      45,
      260,
      48,
      '계속하기',
      actions.resume,
    );
    this.exitButton = new TextButton(
      scene,
      0,
      112,
      260,
      48,
      '게임 나가기',
      () => this.showExitConfirmation(),
      {
        fill: 0x4c2f3a,
        hover: 0x6a3c49,
        stroke: 0xff7b8f,
        text: '#fff2f4',
      },
    );
    this.confirmExitButton = new TextButton(
      scene,
      -100,
      85,
      180,
      48,
      '나가기 확인',
      actions.exitToOpening,
      {
        fill: 0x4c2f3a,
        hover: 0x6a3c49,
        stroke: 0xff7b8f,
        text: '#fff2f4',
      },
    );
    this.cancelButton = new TextButton(
      scene,
      100,
      85,
      160,
      48,
      '취소',
      () => this.showPauseOptions(),
    );
    this.overlay = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        backdrop,
        panel,
        this.title,
        this.body,
        this.resumeButton.gameObject,
        this.exitButton.gameObject,
        this.confirmExitButton.gameObject,
        this.cancelButton.gameObject,
      ])
      .setDepth(140)
      .setVisible(false);
    this.showPauseOptions();
    this.setPauseAvailable(false);
  }

  public setPauseAvailable(available: boolean): void {
    this.pauseAvailable = available;
    this.pauseButton.setEnabled(available);
  }

  public open(): void {
    if (!this.pauseAvailable) return;
    this.showPauseOptions();
    this.overlay.setVisible(true);
    this.pauseButton.setVisible(false);
  }

  public close(): void {
    this.overlay.setVisible(false);
    this.pauseButton.setVisible(true);
    this.pauseButton.setEnabled(this.pauseAvailable);
  }

  private showPauseOptions(): void {
    this.title.setText('일시정지');
    this.body.setText('전투와 모든 타이머가 멈췄습니다.');
    this.resumeButton.setVisible(true);
    this.exitButton.setVisible(true);
    this.confirmExitButton.setVisible(false);
    this.cancelButton.setVisible(false);
  }

  private showExitConfirmation(): void {
    this.title.setText('현재 게임에서 나갈까요?');
    this.body.setText(
      '현재 라운드와 도전 진행은 사라집니다.\n개인 기록, 닉네임과 소리 설정은 유지됩니다.',
    );
    this.resumeButton.setVisible(false);
    this.exitButton.setVisible(false);
    this.confirmExitButton.setVisible(true);
    this.cancelButton.setVisible(true);
  }
}
