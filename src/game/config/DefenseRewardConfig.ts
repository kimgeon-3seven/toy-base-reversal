import {
  WeightedDefensePerformanceRewardPolicy,
  type DefensePerformanceSnapshot,
  type DefenseSortieReward,
} from '../domain/rounds/DefensePerformanceRewardPolicy';
import { prototypeSortiePointPolicy } from './AttackSquadConfig';

export const DEFENSE_REWARD_BASE_OFFSET = 3;
export const MAXIMUM_DEFENSE_KILL_BONUS = 5;
export const MAXIMUM_DEFENSE_CORE_BONUS = 3;

const prototypeDefenseRewardPolicy =
  new WeightedDefensePerformanceRewardPolicy(
    prototypeSortiePointPolicy,
    DEFENSE_REWARD_BASE_OFFSET,
    MAXIMUM_DEFENSE_KILL_BONUS,
    MAXIMUM_DEFENSE_CORE_BONUS,
  );

export function defenseSortieRewardForRound(
  roundNumber: number,
  performance: DefensePerformanceSnapshot,
): DefenseSortieReward {
  return prototypeDefenseRewardPolicy.rewardFor(roundNumber, performance);
}
