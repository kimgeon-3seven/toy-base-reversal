import Phaser from 'phaser';
import { AudioSettingsService } from '../../application/AudioSettingsService';
import { FirstRunGuideService } from '../../application/FirstRunGuideService';
import { GameRecordService } from '../../application/GameRecordService';
import { LeaderboardService } from '../../application/LeaderboardService';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import type { GameRuntime } from '../../ports/GameRuntime';
import type { WebEntryFlow } from '../../ports/WebEntryFlow';
import { BootScene } from '../../presentation/scenes/BootScene';
import { BattlefieldScene } from '../../presentation/scenes/BattlefieldScene';
import { DomNicknameEditor } from '../dom/DomNicknameEditor';
import { LeaderboardRepositoryFactory } from '../http/LeaderboardRepositoryFactory';
import { LocalStorageFirstRunGuideRepository } from '../storage/LocalStorageFirstRunGuideRepository';
import { LocalStorageAudioSettingsRepository } from '../storage/LocalStorageAudioSettingsRepository';
import { LocalStoragePlayerIdentityProvider } from '../storage/LocalStoragePlayerIdentityProvider';
import { LocalStoragePlayerRecordRepository } from '../storage/LocalStoragePlayerRecordRepository';

export class PhaserGameRuntime implements GameRuntime {
  private game: Phaser.Game | null = null;

  public constructor(
    private readonly parentId: string,
    private readonly webEntry: WebEntryFlow,
  ) {}

  public start(): void {
    if (this.game !== null) {
      return;
    }

    const recordService = new GameRecordService(
      new LocalStoragePlayerRecordRepository(window.localStorage),
    );
    const playerIdentity = new LocalStoragePlayerIdentityProvider(
      window.localStorage,
      () => window.crypto.randomUUID(),
    );
    const leaderboardEndpoint = import.meta.env.VITE_LEADERBOARD_ENDPOINT;
    const leaderboardKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const leaderboardRepository = new LeaderboardRepositoryFactory().create({
      endpoint: leaderboardEndpoint,
      publishableKey: leaderboardKey,
    });
    const leaderboardService = new LeaderboardService(
      leaderboardRepository,
      playerIdentity,
    );
    const firstRunGuideService = new FirstRunGuideService(
      new LocalStorageFirstRunGuideRepository(window.localStorage),
    );
    const audioSettingsService = new AudioSettingsService(
      new LocalStorageAudioSettingsRepository(window.localStorage),
    );
    const parent = document.getElementById(this.parentId);
    if (parent === null) {
      throw new Error(`Game parent element #${this.parentId} was not found.`);
    }
    const nicknameEditor = new DomNicknameEditor(parent);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.parentId,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#122b28',
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: 'game-shell',
      },
      scene: [
        new BootScene(this.webEntry),
        new BattlefieldScene(
          recordService,
          leaderboardService,
          nicknameEditor,
          firstRunGuideService,
          audioSettingsService,
        ),
      ],
    });
  }
}
