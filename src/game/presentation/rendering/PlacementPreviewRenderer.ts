import Phaser from 'phaser';
import {
  GRID_CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
} from '../../config/BattlefieldConfig';
import type { GridPosition } from '../../domain/grid/GridPosition';
import { IMAGE_ASSETS } from '../assets/GameAssets';

export type PlacementPreviewTone = 'valid' | 'invalid' | 'select';

export interface PlacementPreviewModel {
  readonly position: GridPosition;
  readonly tone: PlacementPreviewTone;
  readonly label: string;
  readonly texture: string | null;
  readonly displaySize: number;
  readonly towerRangeInCells: number | null;
}

export interface SelectedTowerRangeModel {
  readonly position: GridPosition;
  readonly rangeInCells: number;
}

const TONE_COLORS: Readonly<Record<PlacementPreviewTone, number>> = {
  valid: 0x73e6aa,
  invalid: 0xff6b7f,
  select: 0xffd166,
};

export class PlacementPreviewRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(27);
    this.ghost = scene.add
      .image(0, 0, IMAGE_ASSETS.obstacle)
      .setDepth(28)
      .setVisible(false);
    this.label = scene.add
      .text(0, 0, '', {
        backgroundColor: '#171321e8',
        color: '#f8f4e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setVisible(false);
  }

  public render(
    preview: PlacementPreviewModel | null,
    selectedTower: SelectedTowerRangeModel | null,
  ): void {
    this.graphics.clear();
    this.ghost.setVisible(false);
    this.label.setVisible(false);

    if (selectedTower !== null && preview === null) {
      const center = this.toWorld(selectedTower.position);
      this.drawRange(center, selectedTower.rangeInCells, 0xffd166, 0.14);
    }
    if (preview === null) return;

    const center = this.toWorld(preview.position);
    const color = TONE_COLORS[preview.tone];
    if (preview.towerRangeInCells !== null) {
      this.drawRange(
        center,
        preview.towerRangeInCells,
        color,
        preview.tone === 'invalid' ? 0.07 : 0.12,
      );
    }

    this.graphics.fillStyle(color, preview.tone === 'invalid' ? 0.18 : 0.24);
    this.graphics.fillRoundedRect(
      center.x - GRID_CELL_SIZE / 2 + 3,
      center.y - GRID_CELL_SIZE / 2 + 3,
      GRID_CELL_SIZE - 6,
      GRID_CELL_SIZE - 6,
      7,
    );
    this.graphics.lineStyle(3, color, 0.98);
    this.graphics.strokeRoundedRect(
      center.x - GRID_CELL_SIZE / 2 + 3,
      center.y - GRID_CELL_SIZE / 2 + 3,
      GRID_CELL_SIZE - 6,
      GRID_CELL_SIZE - 6,
      7,
    );
    this.drawCorners(center, color);

    if (preview.texture !== null) {
      this.ghost
        .setTexture(preview.texture)
        .setPosition(center.x, center.y)
        .setDisplaySize(preview.displaySize, preview.displaySize)
        .setTint(color)
        .setAlpha(preview.tone === 'invalid' ? 0.34 : 0.58)
        .setVisible(true);
    }

    const labelY = center.y < GRID_OFFSET_Y + 70 ? center.y + 39 : center.y - 39;
    this.label
      .setText(preview.label)
      .setPosition(
        Phaser.Math.Clamp(center.x, GRID_OFFSET_X + 70, GRID_OFFSET_X + 890),
        labelY,
      )
      .setColor(preview.tone === 'invalid' ? '#ffd2d8' : '#fff7df')
      .setVisible(true);
  }

  private drawRange(
    center: Phaser.Math.Vector2,
    rangeInCells: number,
    color: number,
    fillAlpha: number,
  ): void {
    const radius = rangeInCells * GRID_CELL_SIZE;
    this.graphics.fillStyle(color, fillAlpha);
    this.graphics.fillCircle(center.x, center.y, radius);
    this.graphics.lineStyle(2, color, 0.78);
    this.graphics.strokeCircle(center.x, center.y, radius);
  }

  private drawCorners(center: Phaser.Math.Vector2, color: number): void {
    const radius = GRID_CELL_SIZE / 2 - 7;
    const cornerLength = 8;
    this.graphics.lineStyle(4, color, 1);
    for (const xDirection of [-1, 1]) {
      for (const yDirection of [-1, 1]) {
        const x = center.x + radius * xDirection;
        const y = center.y + radius * yDirection;
        this.graphics.lineBetween(x, y, x - cornerLength * xDirection, y);
        this.graphics.lineBetween(x, y, x, y - cornerLength * yDirection);
      }
    }
  }

  private toWorld(position: GridPosition): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + position.column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + position.row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }
}
