import { IMAGE_ASSETS } from '../assets/GameAssets';

const FACING_DEGREES = {
  up: -90,
  right: 0,
} as const;

export class SpriteFacingProfile {
  public naturalFacingDegrees(texture: string): number {
    if (
      texture === IMAGE_ASSETS.attackerTank ||
      texture === IMAGE_ASSETS.towerPopgun
    ) {
      return FACING_DEGREES.right;
    }
    return FACING_DEGREES.up;
  }
}
