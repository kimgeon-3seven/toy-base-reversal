export class FacingDirectionResolver {
  private static readonly EIGHT_WAY_STEP_DEGREES = 45;

  public directionDegrees(deltaX: number, deltaY: number): number | null {
    if (Math.hypot(deltaX, deltaY) < 0.0001) return null;
    return this.normalizeDegrees(
      (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    );
  }

  public eightWayDegrees(deltaX: number, deltaY: number): number | null {
    const direction = this.directionDegrees(deltaX, deltaY);
    if (direction === null) return null;
    return this.normalizeDegrees(
      Math.round(direction / FacingDirectionResolver.EIGHT_WAY_STEP_DEGREES) *
        FacingDirectionResolver.EIGHT_WAY_STEP_DEGREES,
    );
  }

  public spriteRotationDegrees(
    worldFacingDegrees: number,
    naturalFacingDegrees: number,
  ): number {
    return this.normalizeDegrees(worldFacingDegrees - naturalFacingDegrees);
  }

  public approachDegrees(
    currentDegrees: number,
    targetDegrees: number,
    maximumStepDegrees: number,
  ): number {
    const difference = this.normalizeDegrees(targetDegrees - currentDegrees);
    const step = Math.max(
      -maximumStepDegrees,
      Math.min(maximumStepDegrees, difference),
    );
    return this.normalizeDegrees(currentDegrees + step);
  }

  private normalizeDegrees(degrees: number): number {
    return ((degrees + 180) % 360 + 360) % 360 - 180;
  }
}
