import type Phaser from 'phaser';
import {
  GRID_CELL_SIZE,
  GRID_COLUMNS,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  GRID_ROWS,
} from '../../config/BattlefieldConfig';
import { IMAGE_ASSETS } from '../assets/GameAssets';

export class BattlefieldBackdropRenderer {
  public constructor(scene: Phaser.Scene) {
    const width = GRID_COLUMNS * GRID_CELL_SIZE;
    const height = GRID_ROWS * GRID_CELL_SIZE;
    const centerX = GRID_OFFSET_X + width / 2;
    const centerY = GRID_OFFSET_Y + height / 2;

    scene.add
      .image(centerX, centerY, IMAGE_ASSETS.battlefieldBackground)
      .setDisplaySize(width, height)
      .setDepth(1)
      .setAlpha(0.96);
    scene.add
      .rectangle(centerX, centerY, width, height, 0x092c2b, 0.08)
      .setDepth(2)
      .setStrokeStyle(4, 0xe5cf9c, 0.78);
  }
}
