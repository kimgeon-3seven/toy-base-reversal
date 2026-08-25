export type AttackCombatFeedbackCue =
  | 'core-half'
  | 'core-critical'
  | 'focus-target-destroyed';

export interface AttackCombatFeedbackSnapshot {
  readonly previousCoreRatio: number;
  readonly currentCoreRatio: number;
  readonly focusTargetWasActive: boolean;
  readonly focusTargetStillExists: boolean;
}

export class AttackCombatFeedbackPolicy {
  public resolve(
    snapshot: AttackCombatFeedbackSnapshot,
  ): readonly AttackCombatFeedbackCue[] {
    const cues: AttackCombatFeedbackCue[] = [];
    if (snapshot.previousCoreRatio > 0.25 && snapshot.currentCoreRatio <= 0.25) {
      cues.push('core-critical');
    } else if (
      snapshot.previousCoreRatio > 0.5 &&
      snapshot.currentCoreRatio <= 0.5
    ) {
      cues.push('core-half');
    }
    if (snapshot.focusTargetWasActive && !snapshot.focusTargetStillExists) {
      cues.push('focus-target-destroyed');
    }
    return cues;
  }
}
