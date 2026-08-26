import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { BattlefieldSpriteView, type BattlefieldSpriteState } from './BattlefieldSpriteView';
import { DirectionalAnimationCatalog } from './DirectionalAnimationCatalog';
import { FacingDirectionResolver } from './FacingDirectionResolver';
import { WalkAnimationCadence } from './WalkAnimationCadence';

type ChainableDisplay = Record<string, ReturnType<typeof vi.fn>> & {
  anims: { stop: ReturnType<typeof vi.fn>; timeScale: number };
};

const DISPLAY_METHODS = [
  'clearTint',
  'destroy',
  'play',
  'setAlpha',
  'setAngle',
  'setDepth',
  'setDisplaySize',
  'setFillStyle',
  'setPosition',
  'setStrokeStyle',
  'setTexture',
  'setTint',
  'setTintFill',
  'setVisible',
] as const;

function createChainableDisplay(): ChainableDisplay {
  const display = {
    anims: { stop: vi.fn(), timeScale: 1 },
  } as ChainableDisplay;
  for (const method of DISPLAY_METHODS) {
    display[method] = vi.fn(() => display);
  }
  return display;
}

describe('BattlefieldSpriteView', () => {
  it('starts the stationary attack animation when source and core overlap', () => {
    const image = createChainableDisplay();
    const sceneTime = { now: 100 };
    const scene = {
      time: sceneTime,
      add: {
        ellipse: vi.fn(() => createChainableDisplay()),
        sprite: vi.fn(() => image),
      },
    } as unknown as Phaser.Scene;
    const catalog = new DirectionalAnimationCatalog();
    const animationProfile = catalog.profileForUnit('ranger');
    expect(animationProfile).not.toBeNull();
    const state: BattlefieldSpriteState = {
      texture: 'attacker-ranger',
      x: 320,
      y: 240,
      displaySize: 62,
      depth: 16,
      naturalFacingDegrees: 0,
      initialFacingDegrees: 0,
      facingMode: 'eight-way',
      enableMovementBob: true,
      isMoving: false,
      animationProfile,
    };
    const view = new BattlefieldSpriteView(
      scene,
      new FacingDirectionResolver(),
      catalog,
      new WalkAnimationCadence(),
      'attacker-ranger-test',
      state,
    );
    image.play?.mockClear();

    view.playAttackToward(state.x, state.y);
    sceneTime.now = 101;
    view.sync(state);

    expect(image.play).toHaveBeenCalledWith('ranger-attack-east');
    expect(image.anims.timeScale).toBe(1);
  });

  it('ties the walk animation cadence to the unit movement speed', () => {
    const image = createChainableDisplay();
    const sceneTime = { now: 100 };
    const scene = {
      time: sceneTime,
      add: {
        ellipse: vi.fn(() => createChainableDisplay()),
        sprite: vi.fn(() => image),
      },
    } as unknown as Phaser.Scene;
    const catalog = new DirectionalAnimationCatalog();
    const state: BattlefieldSpriteState = {
      texture: 'attacker-tank',
      x: 100,
      y: 100,
      displaySize: 68,
      depth: 16,
      naturalFacingDegrees: 0,
      initialFacingDegrees: 0,
      facingMode: 'eight-way',
      enableMovementBob: true,
      isMoving: true,
      movementSpeedCellsPerSecond: 1.15,
      animationProfile: catalog.profileForUnit('tank'),
    };

    const view = new BattlefieldSpriteView(
      scene,
      new FacingDirectionResolver(),
      catalog,
      new WalkAnimationCadence(),
      'attacker-tank-test',
      state,
    );
    view.sync({ ...state, x: 101 });

    expect(image.play).toHaveBeenCalledWith('shield-walk-east');
    expect(image.anims.timeScale).toBeCloseTo(5.75 / 8);
  });

  it('slows authored six-frame cycles without changing shield cadence', () => {
    const image = createChainableDisplay();
    const scene = {
      time: { now: 100 },
      add: {
        ellipse: vi.fn(() => createChainableDisplay()),
        sprite: vi.fn(() => image),
      },
    } as unknown as Phaser.Scene;
    const catalog = new DirectionalAnimationCatalog();
    const state: BattlefieldSpriteState = {
      texture: 'attacker-ranger',
      x: 100,
      y: 100,
      displaySize: 70,
      depth: 16,
      naturalFacingDegrees: 0,
      initialFacingDegrees: 0,
      facingMode: 'eight-way',
      enableMovementBob: true,
      isMoving: true,
      movementSpeedCellsPerSecond: 1.15,
      animationProfile: catalog.profileForUnit('ranger'),
    };

    const view = new BattlefieldSpriteView(
      scene,
      new FacingDirectionResolver(),
      catalog,
      new WalkAnimationCadence(),
      'attacker-ranger-cadence-test',
      state,
    );
    view.sync({ ...state, x: 101 });

    expect(image.play).toHaveBeenCalledWith('ranger-walk-east');
    expect(image.anims.timeScale).toBeCloseTo((5.75 / 8) * 0.78);
  });
});
