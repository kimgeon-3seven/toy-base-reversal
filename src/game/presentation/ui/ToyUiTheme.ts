import type Phaser from 'phaser';
import { IMAGE_ASSETS } from '../assets/GameAssets';

export const TOY_UI = {
  ink: '#332617',
  mutedInk: '#6f604d',
  paper: 0xfff4d6,
  paperDark: 0xe6d0a2,
  cardboard: 0xb98247,
  teal: 0x159b8c,
  tealDark: 0x0b615a,
  coral: 0xe95e4f,
  coralDark: 0x9d332e,
  gold: 0xf2b544,
  navy: 0x26384a,
  shadow: 0x2a160d,
  success: 0x2fa979,
  danger: 0xd94343,
  fontFamily: 'Pretendard, "Segoe UI", Arial, sans-serif',
} as const;

export interface PaperPanelOptions {
  readonly accent?: number;
  readonly depth?: number;
  readonly tape?: boolean;
  readonly alpha?: number;
}

/** Builds reusable tabletop-paper surfaces while keeping layout classes focused. */
export class ToyUiFactory {
  public constructor(private readonly scene: Phaser.Scene) {}

  public createPaperPanel(
    width: number,
    height: number,
    options: PaperPanelOptions = {},
  ): readonly Phaser.GameObjects.GameObject[] {
    const accent = options.accent ?? TOY_UI.teal;
    const depth = options.depth ?? 0;
    const shadow = this.scene.add
      .rectangle(5, 7, width, height, TOY_UI.shadow, 0.32)
      .setOrigin(0)
      .setDepth(depth);
    const paper = this.scene.add
      .image(0, 0, IMAGE_ASSETS.paperTexture)
      .setOrigin(0)
      .setDisplaySize(width, height)
      .setAlpha(options.alpha ?? 0.98)
      .setDepth(depth + 1);
    const wash = this.scene.add
      .rectangle(0, 0, width, height, TOY_UI.paper, 0.16)
      .setOrigin(0)
      .setStrokeStyle(3, accent, 0.88)
      .setDepth(depth + 2);
    const accentStrip = this.scene.add
      .rectangle(0, 0, 9, height, accent, 0.94)
      .setOrigin(0)
      .setDepth(depth + 3);
    const objects: Phaser.GameObjects.GameObject[] = [
      shadow,
      paper,
      wash,
      accentStrip,
    ];
    if (options.tape !== false) {
      objects.push(
        this.scene.add
          .rectangle(width * 0.2, -3, 52, 14, 0xe4cc8f, 0.72)
          .setAngle(-5)
          .setDepth(depth + 4),
        this.scene.add
          .rectangle(width * 0.8, -3, 52, 14, 0xe4cc8f, 0.72)
          .setAngle(5)
          .setDepth(depth + 4),
      );
    }
    return objects;
  }

  public createChip(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(x, y, width, height, fill, 0.94)
      .setStrokeStyle(2, 0xffffff, 0.45);
  }
}
