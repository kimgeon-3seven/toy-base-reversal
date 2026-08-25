import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import type { CoreLoopProgressMetric } from '../models/CoreLoopFeedbackPresentation';
import { TOY_UI } from './ToyUiTheme';

export type RoundResultTone = 'success' | 'failure' | 'transition';

export interface RoundResultOverlayModel {
  readonly eyebrow: string;
  readonly title: string;
  readonly metrics: readonly string[];
  readonly progress?: readonly CoreLoopProgressMetric[];
  readonly reward?: string;
  readonly advice: string;
  readonly primaryAction: string;
  readonly secondaryAction?: string;
  readonly tone: RoundResultTone;
  readonly animate?: boolean;
  readonly onPrimary?: () => void;
  readonly onSecondary?: () => void;
}

export class RoundResultOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly emblem: Phaser.GameObjects.Image;
  private readonly eyebrow: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly metrics: Phaser.GameObjects.Text;
  private readonly progressRows: readonly {
    readonly label: Phaser.GameObjects.Text;
    readonly track: Phaser.GameObjects.Rectangle;
    readonly fill: Phaser.GameObjects.Rectangle;
    readonly detail: Phaser.GameObjects.Text;
  }[];
  private readonly reward: Phaser.GameObjects.Text;
  private readonly advice: Phaser.GameObjects.Text;
  private readonly primaryAction: Phaser.GameObjects.Text;
  private readonly secondaryAction: Phaser.GameObjects.Text;
  private revealTimer: Phaser.Time.TimerEvent | null = null;
  private onPrimary: (() => void) | null = null;
  private onSecondary: (() => void) | null = null;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const backdrop = scene.add.rectangle(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x10251e,
      0.76,
    );
    const paper = scene.add
      .image(0, 0, IMAGE_ASSETS.paperTexture)
      .setDisplaySize(790, 500)
      .setAlpha(0.98);
    this.panel = scene.add
      .rectangle(0, 0, 790, 500, TOY_UI.paper, 0.12)
      .setStrokeStyle(4, TOY_UI.teal, 0.95);
    const tapeLeft = scene.add
      .rectangle(-330, -250, 88, 22, 0xd9c891, 0.78)
      .setAngle(-5);
    const tapeRight = scene.add
      .rectangle(330, -250, 88, 22, 0xd9c891, 0.78)
      .setAngle(5);
    this.emblem = scene.add
      .image(-270, -112, IMAGE_ASSETS.roleReversalEmblem)
      .setDisplaySize(154, 154)
      .setAngle(-4)
      .setVisible(false);
    this.eyebrow = scene.add
      .text(0, -205, '', {
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.title = scene.add
      .text(0, -157, '', {
        align: 'center',
        color: '#9d332e',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '38px',
        fontStyle: 'bold',
        wordWrap: { width: 680 },
      })
      .setOrigin(0.5);
    this.metrics = scene.add
      .text(0, -85, '', {
        align: 'center',
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '21px',
        fontStyle: 'bold',
        lineSpacing: 7,
      })
      .setOrigin(0.5);
    this.progressRows = Array.from({ length: 2 }, (_, index) => {
      const y = -62 + index * 34;
      return {
        label: scene.add
          .text(-310, y, '', {
            color: TOY_UI.ink,
            fontFamily: TOY_UI.fontFamily,
            fontSize: '15px',
            fontStyle: 'bold',
          })
          .setOrigin(0, 0.5),
        track: scene.add
          .rectangle(-205, y, 350, 13, 0xc9c4aa, 0.72)
          .setOrigin(0, 0.5),
        fill: scene.add
          .rectangle(-205, y, 350, 13, TOY_UI.teal, 1)
          .setOrigin(0, 0.5),
        detail: scene.add
          .text(305, y, '', {
            color: '#0b615a',
            fontFamily: TOY_UI.fontFamily,
            fontSize: '14px',
            fontStyle: 'bold',
          })
          .setOrigin(1, 0.5),
      };
    });
    this.reward = scene.add
      .text(0, 2, '', {
        align: 'center',
        backgroundColor: '#dce9d2',
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '21px',
        fontStyle: 'bold',
        padding: { x: 18, y: 12 },
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5);
    this.advice = scene.add
      .text(0, 84, '', {
        align: 'center',
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '18px',
        lineSpacing: 5,
        wordWrap: { width: 660 },
      })
      .setOrigin(0.5);
    this.primaryAction = scene.add
      .text(0, 168, '', {
        align: 'center',
        backgroundColor: '#159b8c',
        color: '#fff7df',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '19px',
        fontStyle: 'bold',
        padding: { x: 24, y: 13 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.secondaryAction = scene.add
      .text(0, 220, '', {
        align: 'center',
        color: TOY_UI.mutedInk,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '15px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.primaryAction.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.onPrimary?.();
      },
    );
    this.secondaryAction.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.onSecondary?.();
      },
    );

    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        backdrop,
        paper,
        this.panel,
        tapeLeft,
        tapeRight,
        this.emblem,
        this.eyebrow,
        this.title,
        this.metrics,
        ...this.progressRows.flatMap((row) => [
          row.label,
          row.track,
          row.fill,
          row.detail,
        ]),
        this.reward,
        this.advice,
        this.primaryAction,
        this.secondaryAction,
      ])
      .setDepth(95)
      .setVisible(false);
  }

  public show(model: RoundResultOverlayModel): void {
    this.cancelReveal();
    this.onPrimary = model.onPrimary ?? null;
    this.onSecondary = model.onSecondary ?? null;
    const accent =
      model.tone === 'failure'
        ? 0xff7b8f
        : model.tone === 'transition'
          ? 0x9d8cff
          : 0x9fe3c3;
    const titleColor =
      model.tone === 'failure'
        ? '#a52323'
        : model.tone === 'transition'
          ? '#5b4693'
          : '#0b615a';
    this.panel.setStrokeStyle(3, accent, 0.95);
    this.emblem
      .setVisible(model.tone === 'transition')
      .setPosition(
        model.progress === undefined ? -270 : -316,
        model.progress === undefined ? -112 : -166,
      )
      .setDisplaySize(
        model.progress === undefined ? 154 : 92,
        model.progress === undefined ? 154 : 92,
      );
    this.eyebrow.setText(model.eyebrow).setColor(
      model.tone === 'failure' ? '#a52323' : '#0b615a',
    );
    this.title.setText(model.title).setColor(titleColor);
    this.metrics.setText(model.metrics.join('\n'));
    this.renderProgress(model.progress);
    this.reward.setText(model.reward ?? '').setVisible(model.reward !== undefined);
    this.advice.setText(model.advice);
    this.primaryAction.setText(model.primaryAction);
    this.secondaryAction
      .setText(model.secondaryAction ?? '')
      .setVisible(model.secondaryAction !== undefined);
    if (model.onSecondary === undefined) this.secondaryAction.disableInteractive();
    else this.secondaryAction.setInteractive({ useHandCursor: true });
    this.container.setVisible(true).setAlpha(1).setScale(1);

    if (model.animate === false) return;
    const revealTargets = [
      this.metrics,
      ...(model.reward === undefined ? [] : [this.reward]),
      this.advice,
      this.primaryAction,
      ...(model.secondaryAction === undefined ? [] : [this.secondaryAction]),
    ];
    revealTargets.forEach((target) => target.setAlpha(0));
    this.container.setScale(0.96);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
    let index = 0;
    this.revealTimer = this.scene.time.addEvent({
      delay: 210,
      repeat: revealTargets.length - 1,
      callback: () => {
        const target = revealTargets[index];
        index += 1;
        if (target === undefined) return;
        this.scene.tweens.add({
          targets: target,
          alpha: 1,
          y: target.y,
          duration: 180,
          ease: 'Quad.easeOut',
        });
      },
    });
  }

  public hide(): void {
    this.cancelReveal();
    this.onPrimary = null;
    this.onSecondary = null;
    this.container.setVisible(false);
  }

  private cancelReveal(): void {
    this.revealTimer?.remove(false);
    this.revealTimer = null;
  }

  private renderProgress(
    progress: readonly CoreLoopProgressMetric[] | undefined,
  ): void {
    const visible = progress !== undefined && progress.length > 0;
    this.title.setY(visible ? -170 : -157);
    this.metrics.setY(visible ? -112 : -85).setFontSize(visible ? 18 : 21);
    this.reward.setY(visible ? 30 : 2);
    this.advice.setY(visible ? 101 : 84);
    this.primaryAction.setY(visible ? 181 : 168);
    this.secondaryAction.setY(visible ? 226 : 220);
    this.progressRows.forEach((row, index) => {
      const metric = progress?.[index];
      const rowVisible = metric !== undefined;
      row.label.setVisible(rowVisible).setText(metric?.label ?? '');
      row.track.setVisible(rowVisible);
      row.fill
        .setVisible(rowVisible)
        .setDisplaySize(350 * Math.max(0, Math.min(1, metric?.ratio ?? 0)), 13);
      row.detail.setVisible(rowVisible).setText(metric?.detail ?? '');
    });
  }
}
