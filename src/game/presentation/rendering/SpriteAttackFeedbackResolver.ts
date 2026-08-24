import type { FacingDirectionResolver } from './FacingDirectionResolver';
import type { SpriteFacingMode } from './SpriteFacingMode';

export interface SpriteAttackFeedback {
  readonly facingDegrees: number | null;
  readonly recoilX: number;
  readonly recoilY: number;
}

const MINIMUM_DIRECTION_LENGTH = 0.0001;
const RECOIL_DISTANCE = 4;

export class SpriteAttackFeedbackResolver {
  public constructor(
    private readonly facingResolver: FacingDirectionResolver,
  ) {}

  public resolve(
    facingMode: SpriteFacingMode,
    deltaX: number,
    deltaY: number,
  ): SpriteAttackFeedback {
    const length = Math.hypot(deltaX, deltaY);
    if (facingMode === 'static' || length < MINIMUM_DIRECTION_LENGTH) {
      return {
        facingDegrees: null,
        recoilX: 0,
        recoilY: 0,
      };
    }

    const facingDegrees =
      facingMode === 'eight-way'
        ? this.facingResolver.eightWayDegrees(deltaX, deltaY)
        : this.facingResolver.directionDegrees(deltaX, deltaY);
    return {
      facingDegrees,
      recoilX: (-deltaX / length) * RECOIL_DISTANCE,
      recoilY: (-deltaY / length) * RECOIL_DISTANCE,
    };
  }
}
