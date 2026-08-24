import Phaser from 'phaser';
import { TOY_UI, ToyUiFactory } from './ToyUiTheme';

export type CommanderAbilityState =
  | 'ready'
  | 'cooldown'
  | 'targeting'
  | 'active';

export interface CommanderAbilityModel {
  readonly state: CommanderAbilityState;
  readonly cooldownRemainingMs: number;
  readonly cooldownDurationMs: number;
}

export interface CommanderAbilityPanelModel {
  readonly visible: boolean;
  readonly focus: CommanderAbilityModel;
  readonly disrupt: CommanderAbilityModel;
}

interface AbilityCard {
  readonly background: Phaser.GameObjects.Rectangle;
  readonly key: Phaser.GameObjects.Text;
  readonly name: Phaser.GameObjects.Text;
  readonly state: Phaser.GameObjects.Text;
  readonly track: Phaser.GameObjects.Rectangle;
  readonly progress: Phaser.GameObjects.Rectangle;
}

export class CommanderAbilityPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly focusCard: AbilityCard;
  private readonly disruptCard: AbilityCard;

  public constructor(
    scene: Phaser.Scene,
    onFocus: () => void,
    onDisrupt: () => void,
  ) {
    const ui = new ToyUiFactory(scene);
    const panel = ui.createPaperPanel(264, 112, {
      accent: TOY_UI.teal,
      tape: false,
    });
    const title = scene.add.text(16, 10, '지휘관 명령', {
      color: '#0b615a',
      fontFamily: TOY_UI.fontFamily,
      fontSize: '12px',
      fontStyle: 'bold',
    });
    this.focusCard = this.createCard(
      scene,
      12,
      38,
      'Q',
      '집중 공격',
      TOY_UI.teal,
      onFocus,
    );
    this.disruptCard = this.createCard(
      scene,
      136,
      38,
      'E',
      '교란',
      0x8267c7,
      onDisrupt,
    );
    this.container = scene.add
      .container(1004, 552, [
        ...panel,
        title,
        ...this.cardObjects(this.focusCard),
        ...this.cardObjects(this.disruptCard),
      ])
      .setDepth(58)
      .setVisible(false);
  }

  public render(model: CommanderAbilityPanelModel): void {
    this.container.setVisible(model.visible);
    if (!model.visible) return;
    this.renderCard(this.focusCard, model.focus, TOY_UI.teal);
    this.renderCard(this.disruptCard, model.disrupt, 0x8267c7);
  }

  private createCard(
    scene: Phaser.Scene,
    x: number,
    y: number,
    keyLabel: string,
    nameLabel: string,
    color: number,
    onClick: () => void,
  ): AbilityCard {
    const background = scene.add
      .rectangle(x, y, 116, 62, 0xf0dfb8, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, color, 0.75)
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          onClick();
        },
      );
    const key = scene.add
      .text(x + 12, y + 13, keyLabel, {
        backgroundColor: color === TOY_UI.teal ? '#0b615a' : '#5e4c91',
        color: '#ffffff',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5);
    const name = scene.add.text(x + 27, y + 6, nameLabel, {
      color: TOY_UI.ink,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '13px',
      fontStyle: 'bold',
    });
    const state = scene.add
      .text(x + 106, y + 30, '', {
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '11px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);
    const track = scene.add
      .rectangle(x + 8, y + 53, 100, 5, 0xc7af82, 1)
      .setOrigin(0, 0.5);
    const progress = scene.add
      .rectangle(x + 8, y + 53, 100, 5, color, 1)
      .setOrigin(0, 0.5);
    background.on('pointerover', () => background.setFillStyle(0xfff5d9, 1));
    background.on('pointerout', () => background.setFillStyle(0xf0dfb8, 0.98));
    return { background, key, name, state, track, progress };
  }

  private renderCard(
    card: AbilityCard,
    model: CommanderAbilityModel,
    color: number,
  ): void {
    const readyRatio =
      model.cooldownDurationMs <= 0
        ? 1
        : 1 - model.cooldownRemainingMs / model.cooldownDurationMs;
    card.progress.setDisplaySize(100 * Phaser.Math.Clamp(readyRatio, 0, 1), 5);
    const labels: Readonly<Record<CommanderAbilityState, string>> = {
      ready: '준비',
      cooldown: `${Math.ceil(model.cooldownRemainingMs / 1000)}초`,
      targeting: '대상 선택',
      active: '명령 중',
    };
    card.state.setText(labels[model.state]);
    const highlighted = model.state === 'targeting' || model.state === 'active';
    card.background.setStrokeStyle(highlighted ? 4 : 2, color, 0.95);
    card.state.setColor(model.state === 'cooldown' ? '#8a7b69' : '#332617');
    card.key.setAlpha(model.state === 'cooldown' ? 0.55 : 1);
    card.name.setAlpha(model.state === 'cooldown' ? 0.62 : 1);
  }

  private cardObjects(card: AbilityCard): Phaser.GameObjects.GameObject[] {
    return [
      card.background,
      card.key,
      card.name,
      card.state,
      card.track,
      card.progress,
    ];
  }
}
