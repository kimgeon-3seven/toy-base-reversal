import type Phaser from 'phaser';
import { TOY_UI } from './ToyUiTheme';

export interface TextButtonColors {
  readonly fill: number;
  readonly hover: number;
  readonly stroke: number;
  readonly text: string;
}

const DEFAULT_COLORS: TextButtonColors = {
  fill: 0xf0dfb8,
  hover: 0xfff5d9,
  stroke: 0x8f6b3b,
  text: TOY_UI.ink,
};

export class TextButton {
  public readonly gameObject: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Rectangle;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private enabled = true;
  private selected = false;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    private readonly colors: TextButtonColors = DEFAULT_COLORS,
  ) {
    this.shadow = scene.add.rectangle(4, 5, width, height, TOY_UI.shadow, 0.42);
    this.background = scene.add
      .rectangle(0, 0, width, height, this.colors.fill, 1)
      .setStrokeStyle(2, this.colors.stroke, 0.92)
      .setInteractive({ useHandCursor: true });
    this.label = scene.add
      .text(0, 0, label, {
        color: this.colors.text,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '15px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.gameObject = scene.add.container(x, y, [
      this.shadow,
      this.background,
      this.label,
    ]);

    this.background.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        if (this.enabled) onClick();
      },
    );
    this.background.on('pointerover', () => {
      if (this.enabled) this.background.setFillStyle(this.colors.hover, 1);
    });
    this.background.on('pointerout', () => {
      this.refreshAppearance();
    });
  }

  public setLabel(label: string): void {
    this.label.setText(label);
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.gameObject.setAlpha(enabled ? 1 : 0.42);
    if (enabled) {
      this.background.setInteractive({ useHandCursor: true });
    } else {
      this.background.disableInteractive();
    }
  }

  public setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.refreshAppearance();
  }

  public setVisible(visible: boolean): void {
    this.gameObject.setVisible(visible);
  }

  public setDepth(depth: number): void {
    this.gameObject.setDepth(depth);
  }

  private refreshAppearance(): void {
    this.background
      .setFillStyle(this.selected ? this.colors.hover : this.colors.fill, 1)
      .setStrokeStyle(
        this.selected ? 4 : 2,
        this.selected ? TOY_UI.coral : this.colors.stroke,
        0.95,
      );
    this.shadow.setAlpha(this.selected ? 0.92 : 0.72);
  }
}
