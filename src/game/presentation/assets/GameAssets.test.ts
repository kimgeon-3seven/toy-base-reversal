import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { IMAGE_ASSETS, preloadGameAssets } from './GameAssets';

describe('preloadGameAssets', () => {
  it('loads only the stabilized walk sheets while preserving attack assets', () => {
    const loader = {
      image: vi.fn(),
      spritesheet: vi.fn(),
      audio: vi.fn(),
    } as unknown as Phaser.Loader.LoaderPlugin;

    preloadGameAssets(loader);

    expect(loader.spritesheet).toHaveBeenCalledWith(
      IMAGE_ASSETS.attackerTankWalk,
      expect.stringContaining('unit-shield-walk-8way-v2.png'),
      { frameWidth: 160, frameHeight: 160 },
    );
    expect(loader.spritesheet).toHaveBeenCalledWith(
      IMAGE_ASSETS.attackerSwarmWalk,
      expect.stringContaining('unit-windup-walk-8way-v2.png'),
      { frameWidth: 160, frameHeight: 160 },
    );
    expect(loader.spritesheet).toHaveBeenCalledWith(
      IMAGE_ASSETS.attackerRangerWalk,
      expect.stringContaining('unit-ranger-walk-8way-v2.png'),
      { frameWidth: 160, frameHeight: 160 },
    );
    expect(loader.spritesheet).toHaveBeenCalledWith(
      IMAGE_ASSETS.attackerSwarmAttack,
      expect.stringContaining('unit-windup-attack-8way-v1.png'),
      { frameWidth: 160, frameHeight: 160 },
    );
    expect(loader.spritesheet).toHaveBeenCalledWith(
      IMAGE_ASSETS.attackerRangerAttack,
      expect.stringContaining('unit-ranger-attack-8way-v1.png'),
      { frameWidth: 160, frameHeight: 160 },
    );
  });
});
