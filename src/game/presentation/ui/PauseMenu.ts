import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import { TextButton } from './TextButton';
import { TOY_UI } from './ToyUiTheme';

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
      832,
      50,
      84,
      38,
      'Ⅱ 멈춤',
      actions.pause,
    );
    this.pauseButton.setDepth(143);

    const backdrop = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x10251e, 0.82)
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
    const paper = scene.add
      .image(0, 0, IMAGE_ASSETS.paperTexture)
      .setDisplaySize(560, 390)
      .setAlpha(0.99);
    const panel = scene.add
      .rectangle(0, 0, 560, 390, TOY_UI.paper, 0.1)
      .setStrokeStyle(4, TOY_UI.teal, 0.95);
    const tapeLeft = scene.add.rectangle(-195, -196, 80, 20, 0xe4cc8f, 0.75).setAngle(-5);
    const tapeRight = scene.add.rectangle(195, -196, 80, 20, 0xe4cc8f, 0.75).setAngle(5);
    this.title = scene.add
      .text(0, -132, '일시정지', {
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '34px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.body = scene.add
      .text(0, -70, '전투와 모든 타이머가 멈췄습니다.', {
        align: 'center',
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
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
      {
        fill: TOY_UI.teal,
        hover: 0x22b7a6,
        stroke: TOY_UI.tealDark,
        text: '#fffdf3',
      },
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
        fill: TOY_UI.coral,
        hover: 0xf47768,
        stroke: TOY_UI.coralDark,
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
        fill: TOY_UI.coral,
        hover: 0xf47768,
        stroke: TOY_UI.coralDark,
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
        paper,
        panel,
        tapeLeft,
        tapeRight,
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
