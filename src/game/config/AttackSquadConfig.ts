import {
  BalancedSquadPreset,
  SquadPlanFactory,
  type UnitAvailabilityPolicy,
} from '../application/SquadPlanFactory';
import type { AttackUnitKind, SquadPlan } from '../domain/attack/SquadPlan';
import { StagedCappedSortiePointPolicy } from '../domain/attack/SortiePointPolicy';
import { availableUnitArchetypes } from './ContentConfig';
import {
  CHALLENGE_MAX_SORTIE_POINTS,
  CHALLENGE_SORTIE_POINTS_PER_ROUND,
  NORMAL_MODE_ROUND_COUNT,
} from './ChallengeModeConfig';

export const STARTING_SORTIE_POINTS = 24;
export const SORTIE_POINTS_PER_ROUND = 3;
export const ATTACK_LANE_COUNT = 3;
export const SIMULTANEOUS_CAPACITY_PER_LANE = 2;
export const SQUAD_SPAWN_INTERVAL_MS = 900;

class PrototypeUnitAvailability implements UnitAvailabilityPolicy {
  public availableUnits(roundNumber: number): readonly AttackUnitKind[] {
    return availableUnitArchetypes(roundNumber);
  }
}

export const prototypeSortiePointPolicy = new StagedCappedSortiePointPolicy(
  STARTING_SORTIE_POINTS,
  SORTIE_POINTS_PER_ROUND,
  NORMAL_MODE_ROUND_COUNT,
  CHALLENGE_SORTIE_POINTS_PER_ROUND,
  CHALLENGE_MAX_SORTIE_POINTS,
);

const prototypeSquadPlanFactory = new SquadPlanFactory(
  prototypeSortiePointPolicy,
  new BalancedSquadPreset(new PrototypeUnitAvailability()),
  {
    laneCount: ATTACK_LANE_COUNT,
    simultaneousCapacityPerLane: SIMULTANEOUS_CAPACITY_PER_LANE,
    spawnIntervalMs: SQUAD_SPAWN_INTERVAL_MS,
  },
);

export function sortiePointsForRound(roundNumber: number): number {
  return prototypeSortiePointPolicy.pointsForRound(roundNumber);
}

export function createPrototypeSquadPlan(
  roundNumber = 1,
  applyRecommendedPreset = true,
  totalBudgetOverride?: number,
): SquadPlan {
  return totalBudgetOverride === undefined
    ? prototypeSquadPlanFactory.create(roundNumber, applyRecommendedPreset)
    : prototypeSquadPlanFactory.createWithBudget(
        roundNumber,
        totalBudgetOverride,
        applyRecommendedPreset,
      );
}
