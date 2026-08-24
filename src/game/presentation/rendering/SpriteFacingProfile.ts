import { IMAGE_ASSETS } from '../assets/GameAssets';

const FACING_DEGREES = {
  up: -90,
  right: 0,
} as const;

export class SpriteFacingProfile {
  public naturalFacingDegrees(texture: string): number {
    if (
      texture === IMAGE_ASSETS.attackerTank ||
      texture === IMAGE_ASSETS.attackerSwarm ||
      texture === IMAGE_ASSETS.attackerRanger ||
      texture === IMAGE_ASSETS.defenderTank ||
      texture === IMAGE_ASSETS.defenderSwarm ||
      texture === IMAGE_ASSETS.defenderRanger ||
      texture === IMAGE_ASSETS.commander ||
      texture === IMAGE_ASSETS.obstacle ||
      texture === IMAGE_ASSETS.towerPopgun ||
      texture === IMAGE_ASSETS.towerMortar ||
      texture === IMAGE_ASSETS.towerPiercer
    ) {
      return FACING_DEGREES.right;
    }
    return FACING_DEGREES.up;
  }
}
