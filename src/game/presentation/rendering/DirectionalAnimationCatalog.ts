import type Phaser from 'phaser';
import type { UnitArchetype } from '../../domain/combat/CombatArchetype';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import type { SpriteAnimationAction } from './SpriteAnimationStateMachine';

export type SpriteDirection =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest';

export interface DirectionalAnimationProfile {
  readonly id: string;
  readonly walkTexture: string;
  readonly attackTexture: string;
  readonly walkFrameOffsets: readonly number[];
}

const DIRECTIONS: readonly SpriteDirection[] = [
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest',
];

const SHIELD_PROFILE: DirectionalAnimationProfile = {
  id: 'shield',
  walkTexture: IMAGE_ASSETS.attackerTankWalk,
  attackTexture: IMAGE_ASSETS.attackerTankAttack,
  walkFrameOffsets: [0, 1, 2, 1],
};

const WINDUP_PROFILE: DirectionalAnimationProfile = {
  id: 'windup',
  walkTexture: IMAGE_ASSETS.attackerSwarmWalk,
  attackTexture: IMAGE_ASSETS.attackerSwarmAttack,
  walkFrameOffsets: [0, 1, 2, 3],
};

const UNIT_PROFILES: Readonly<
  Partial<Record<UnitArchetype, DirectionalAnimationProfile>>
> = {
  tank: SHIELD_PROFILE,
  swarm: WINDUP_PROFILE,
};

export class DirectionalAnimationCatalog {
  public profileForUnit(
    archetype: UnitArchetype,
  ): DirectionalAnimationProfile | null {
    return UNIT_PROFILES[archetype] ?? null;
  }

  public directionForDegrees(degrees: number): SpriteDirection {
    const normalized = ((degrees % 360) + 360) % 360;
    const index = Math.round(normalized / 45) % 8;
    const screenClockwiseOrder: readonly SpriteDirection[] = [
      'east',
      'southeast',
      'south',
      'southwest',
      'west',
      'northwest',
      'north',
      'northeast',
    ];
    return screenClockwiseOrder[index] ?? 'east';
  }

  public animationKey(
    profile: DirectionalAnimationProfile,
    action: Exclude<SpriteAnimationAction, 'idle'>,
    direction: SpriteDirection,
  ): string {
    return `${profile.id}-${action}-${direction}`;
  }

  public idleFrame(direction: SpriteDirection): number {
    return this.directionRow(direction) * 4;
  }

  public register(scene: Phaser.Scene): void {
    for (const profile of Object.values(UNIT_PROFILES)) {
      if (profile !== undefined) this.registerProfile(scene, profile);
    }
  }

  private registerProfile(
    scene: Phaser.Scene,
    profile: DirectionalAnimationProfile,
  ): void {
    for (const direction of DIRECTIONS) {
      const row = this.directionRow(direction);
      this.createAnimation(scene, profile, 'walk', direction, row, 10, -1);
      this.createAnimation(scene, profile, 'attack', direction, row, 12, 0);
    }
  }

  private createAnimation(
    scene: Phaser.Scene,
    profile: DirectionalAnimationProfile,
    action: Exclude<SpriteAnimationAction, 'idle'>,
    direction: SpriteDirection,
    row: number,
    frameRate: number,
    repeat: number,
  ): void {
    const key = this.animationKey(profile, action, direction);
    if (scene.anims.exists(key)) return;
    const texture = action === 'walk' ? profile.walkTexture : profile.attackTexture;
    const firstFrame = row * 4;
    const frameOffsets =
      action === 'walk' ? profile.walkFrameOffsets : [0, 1, 2, 3];
    const frameNumbers = frameOffsets.map((offset) => firstFrame + offset);
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, {
        frames: frameNumbers,
      }),
      frameRate,
      repeat,
    });
  }

  private directionRow(direction: SpriteDirection): number {
    return DIRECTIONS.indexOf(direction);
  }
}
