import type Phaser from 'phaser';
import type { AttackUnitKind } from '../../domain/attack/SquadPlan';
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
};

export class DirectionalAnimationCatalog {
  public profileForAttackUnit(
    unitKind: AttackUnitKind,
  ): DirectionalAnimationProfile | null {
    return unitKind === 'tank' ? SHIELD_PROFILE : null;
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
    this.registerProfile(scene, SHIELD_PROFILE);
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
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, {
        start: row * 4,
        end: row * 4 + 3,
      }),
      frameRate,
      repeat,
    });
  }

  private directionRow(direction: SpriteDirection): number {
    return DIRECTIONS.indexOf(direction);
  }
}
