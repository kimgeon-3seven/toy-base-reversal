export type SpriteAnimationAction = 'idle' | 'walk' | 'attack';

export class SpriteAnimationStateMachine {
  private attackUntilMs = 0;
  private moving = false;
  private walkUntilMs = 0;

  public beginAttack(nowMs: number, durationMs: number): void {
    this.attackUntilMs = Math.max(
      this.attackUntilMs,
      nowMs + Math.max(0, durationMs),
    );
  }

  public setMoving(
    moving: boolean,
    nowMs: number,
    stopGraceDurationMs: number,
  ): void {
    if (moving) {
      this.moving = true;
      this.walkUntilMs = 0;
      return;
    }
    if (!this.moving) return;
    this.moving = false;
    this.walkUntilMs = nowMs + Math.max(0, stopGraceDurationMs);
  }

  public resolve(nowMs: number): SpriteAnimationAction {
    if (nowMs < this.attackUntilMs) return 'attack';
    return this.moving || nowMs < this.walkUntilMs ? 'walk' : 'idle';
  }
}
