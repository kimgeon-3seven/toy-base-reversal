import Phaser from 'phaser';
import { preloadGameAssets } from '../assets/GameAssets';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    preloadGameAssets(this.load);
  }

  public create(): void {
    this.scene.start('BattlefieldScene');
  }
}
