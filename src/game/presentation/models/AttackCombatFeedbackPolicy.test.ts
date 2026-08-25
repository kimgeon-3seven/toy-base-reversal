import { describe, expect, it } from 'vitest';
import { AttackCombatFeedbackPolicy } from './AttackCombatFeedbackPolicy';

describe('AttackCombatFeedbackPolicy', () => {
  const policy = new AttackCombatFeedbackPolicy();

  it('announces a core threshold only when it is crossed', () => {
    expect(
      policy.resolve({
        previousCoreRatio: 0.51,
        currentCoreRatio: 0.49,
        focusTargetWasActive: false,
        focusTargetStillExists: false,
      }),
    ).toEqual(['core-half']);
    expect(
      policy.resolve({
        previousCoreRatio: 0.49,
        currentCoreRatio: 0.48,
        focusTargetWasActive: false,
        focusTargetStillExists: false,
      }),
    ).toEqual([]);
  });

  it('prioritizes the critical warning when one hit crosses both thresholds', () => {
    expect(
      policy.resolve({
        previousCoreRatio: 0.7,
        currentCoreRatio: 0.2,
        focusTargetWasActive: false,
        focusTargetStillExists: false,
      }),
    ).toEqual(['core-critical']);
  });

  it('confirms a focus target only when the active target disappears', () => {
    expect(
      policy.resolve({
        previousCoreRatio: 1,
        currentCoreRatio: 1,
        focusTargetWasActive: true,
        focusTargetStillExists: false,
      }),
    ).toEqual(['focus-target-destroyed']);
  });
});
