import Phaser from 'phaser';
import { GameRecordService } from '../../application/GameRecordService';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import type { GameRuntime } from '../../ports/GameRuntime';
import { BootScene } from '../../presentation/scenes/BootScene';
import { BattlefieldScene } from '../../presentation/scenes/BattlefieldScene';
import { LocalStoragePlayerRecordRepository } from '../storage/LocalStoragePlayerRecordRepository';

export class PhaserGameRuntime implements GameRuntime {
  private game: Phaser.Game | null = null;

  public constructor(private readonly parentId: string) {}

  public start(): void {
    if (this.game !== null) {
      return;
    }

    const recordService = new GameRecordService(
      new LocalStoragePlayerRecordRepository(window.localStorage),
    );
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.parentId,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#15131e',
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, new BattlefieldScene(recordService)],
    });
  }
}
