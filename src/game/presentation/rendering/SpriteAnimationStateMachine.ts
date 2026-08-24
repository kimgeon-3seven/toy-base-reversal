export type SpriteAnimationAction = 'idle' | 'walk' | 'attack';

export class SpriteAnimationStateMachine {
  private attackUntilMs = 0;
  private walkUntilMs = 0;

  public beginAttack(nowMs: number, durationMs: number): void {
    this.attackUntilMs = Math.max(
      this.attackUntilMs,
      nowMs + Math.max(0, durationMs),
    );
  }

  public observeMovement(nowMs: number, graceDurationMs: number): void {
    this.walkUntilMs = Math.max(
      this.walkUntilMs,
      nowMs + Math.max(0, graceDurationMs),
    );
  }

  public resolve(nowMs: number): SpriteAnimationAction {
    if (nowMs < this.attackUntilMs) return 'attack';
    return nowMs < this.walkUntilMs ? 'walk' : 'idle';
  }
}
