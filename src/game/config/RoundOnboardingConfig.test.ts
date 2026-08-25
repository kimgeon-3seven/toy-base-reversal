import { describe, expect, it } from 'vitest';
import {
  ROUND_ONBOARDING_POLICY,
  STANDARD_DEFENSE_PREPARATION_DURATION_MS,
  TUTORIAL_DEFENSE_PREPARATION_DURATION_MS,
} from './RoundOnboardingConfig';

describe('RoundOnboardingPolicy', () => {
  it('turns the first normal round into a short guided defense', () => {
    expect(ROUND_ONBOARDING_POLICY.resolve(1, false)).toMatchObject({
      tutorialRound: true,
      defensePreparationDurationMs: TUTORIAL_DEFENSE_PREPARATION_DURATION_MS,
      defenseWaveCountOverride: 2,
      advancedDefenseEditing: false,
    });
  });

  it('restores full strategy controls from the second round', () => {
    expect(ROUND_ONBOARDING_POLICY.resolve(2, false)).toMatchObject({
      tutorialRound: false,
      defensePreparationDurationMs: STANDARD_DEFENSE_PREPARATION_DURATION_MS,
      defenseWaveCountOverride: null,
      advancedDefenseEditing: true,
    });
  });

  it('never applies tutorial restrictions to challenge rounds', () => {
    expect(ROUND_ONBOARDING_POLICY.resolve(6, true).tutorialRound).toBe(false);
  });
});
