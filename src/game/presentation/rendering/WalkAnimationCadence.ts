const DEFAULT_BASE_FRAME_RATE = 8;
const DEFAULT_FRAMES_PER_GRID_CELL = 5;
const DEFAULT_MIN_FRAME_RATE = 4;
const DEFAULT_MAX_FRAME_RATE = 11;

export const WALK_ANIMATION_BASE_FRAME_RATE = DEFAULT_BASE_FRAME_RATE;

export interface WalkAnimationCadencePolicy {
  timeScaleFor(movementSpeedCellsPerSecond?: number): number;
}

export class WalkAnimationCadence implements WalkAnimationCadencePolicy {
  public constructor(
    private readonly baseFrameRate = DEFAULT_BASE_FRAME_RATE,
    private readonly framesPerGridCell = DEFAULT_FRAMES_PER_GRID_CELL,
    private readonly minFrameRate = DEFAULT_MIN_FRAME_RATE,
    private readonly maxFrameRate = DEFAULT_MAX_FRAME_RATE,
  ) {
    if (
      baseFrameRate <= 0 ||
      framesPerGridCell <= 0 ||
      minFrameRate <= 0 ||
      maxFrameRate < minFrameRate
    ) {
      throw new Error('Walk animation cadence values must be positive.');
    }
  }

  public timeScaleFor(movementSpeedCellsPerSecond?: number): number {
    if (
      movementSpeedCellsPerSecond === undefined ||
      !Number.isFinite(movementSpeedCellsPerSecond) ||
      movementSpeedCellsPerSecond <= 0
    ) {
      return 1;
    }

    const targetFrameRate = Math.min(
      this.maxFrameRate,
      Math.max(
        this.minFrameRate,
        movementSpeedCellsPerSecond * this.framesPerGridCell,
      ),
    );
    return targetFrameRate / this.baseFrameRate;
  }
}
