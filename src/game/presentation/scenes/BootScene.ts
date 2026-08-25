import Phaser from 'phaser';
import type { WebEntryFlow } from '../../ports/WebEntryFlow';
import { preloadGameAssets } from '../assets/GameAssets';

export class BootScene extends Phaser.Scene {
  private loadFailed = false;
  private readonly handleLoadProgress = (progress: number): void => {
    this.webEntry.reportProgress(progress);
  };
  private readonly handleLoadError = (): void => {
    this.loadFailed = true;
  };

  public constructor(private readonly webEntry: WebEntryFlow) {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.loadFailed = false;
    this.webEntry.loading();
    this.load.off(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError);
    this.load.on(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleLoadError);
    preloadGameAssets(this.load);
  }

  public create(): void {
    if (this.loadFailed) {
      this.webEntry.failed(
        '일부 게임 파일을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.',
        () => this.scene.restart(),
      );
      return;
    }

    this.webEntry.ready({
      activateAudio: () => this.activateAudio(),
      launch: () => this.scene.start('BattlefieldScene'),
    });
  }

  private async activateAudio(): Promise<void> {
    if (this.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      await this.sound.context.resume();
    } else if (
      this.sound instanceof Phaser.Sound.HTML5AudioSoundManager &&
      this.sound.locked
    ) {
      this.sound.unlock();
    }
  }
}
