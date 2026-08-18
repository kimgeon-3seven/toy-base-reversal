export const NORMAL_MODE_ROUND_COUNT = 5;

export const CHALLENGE_STARTING_WAVE_COUNT = 8;
export const CHALLENGE_MAX_WAVE_COUNT = 12;
export const CHALLENGE_ENEMY_HEALTH_BONUS_PER_ROUND = 8;
export const CHALLENGE_ENEMY_DAMAGE_BONUS_PER_ROUND = 1;

export const CHALLENGE_CORE_HEALTH_PER_ROUND = 350;

export const CHALLENGE_SORTIE_POINTS_PER_ROUND = 2;
export const CHALLENGE_MAX_SORTIE_POINTS = 48;

export function challengeRoundFor(roundNumber: number): number {
  if (!Number.isInteger(roundNumber) || roundNumber <= 0) {
    throw new Error('Round number must be a positive integer.');
  }
  return Math.max(0, roundNumber - NORMAL_MODE_ROUND_COUNT);
}

