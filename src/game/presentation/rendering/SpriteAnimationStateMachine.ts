export type SpriteAnimationAction = 'idle' | 'walk' | 'attack';

export class SpriteAnimationStateMachine {
  private attackUntilMs = 0;

  public beginAttack(nowMs: number, durationMs: number): void {
    this.attackUntilMs = Math.max(
      this.attackUntilMs,
      nowMs + Math.max(0, durationMs),
    );
  }

  public resolve(nowMs: number, isMoving: boolean): SpriteAnimationAction {
    if (nowMs < this.attackUntilMs) return 'attack';
    return isMoving ? 'walk' : 'idle';
  }
}
