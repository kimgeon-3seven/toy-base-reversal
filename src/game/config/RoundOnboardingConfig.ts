export interface GridHintPosition {
  readonly column: number;
  readonly row: number;
}

export interface RoundOnboardingProfile {
  readonly tutorialRound: boolean;
  readonly defensePreparationDurationMs: number;
  readonly defenseWaveCountOverride: number | null;
  readonly defenseSpawnIntervalMs: number;
  readonly advancedDefenseEditing: boolean;
  readonly placementHints: readonly GridHintPosition[];
}

export const STANDARD_DEFENSE_PREPARATION_DURATION_MS = 30_000;
export const TUTORIAL_DEFENSE_PREPARATION_DURATION_MS = 12_000;
export const STANDARD_DEFENSE_SPAWN_INTERVAL_MS = 1_750;
export const TUTORIAL_DEFENSE_SPAWN_INTERVAL_MS = 1_350;

const STANDARD_PROFILE: RoundOnboardingProfile = {
  tutorialRound: false,
  defensePreparationDurationMs: STANDARD_DEFENSE_PREPARATION_DURATION_MS,
  defenseWaveCountOverride: null,
  defenseSpawnIntervalMs: STANDARD_DEFENSE_SPAWN_INTERVAL_MS,
  advancedDefenseEditing: true,
  placementHints: [],
};

const FIRST_ROUND_PROFILE: RoundOnboardingProfile = {
  tutorialRound: true,
  defensePreparationDurationMs: TUTORIAL_DEFENSE_PREPARATION_DURATION_MS,
  defenseWaveCountOverride: 2,
  defenseSpawnIntervalMs: TUTORIAL_DEFENSE_SPAWN_INTERVAL_MS,
  advancedDefenseEditing: false,
  placementHints: [
    { column: 10, row: 4 },
    { column: 14, row: 8 },
  ],
};

export class RoundOnboardingPolicy {
  public resolve(
    roundNumber: number,
    challengeMode: boolean,
  ): RoundOnboardingProfile {
    if (roundNumber === 1 && !challengeMode) return FIRST_ROUND_PROFILE;
    return STANDARD_PROFILE;
  }
}

export const ROUND_ONBOARDING_POLICY = new RoundOnboardingPolicy();
