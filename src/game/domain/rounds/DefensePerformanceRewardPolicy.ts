import type { SortiePointPolicy } from '../attack/SortiePointPolicy';

export interface DefensePerformanceSnapshot {
  readonly defeatedEnemies: number;
  readonly breachedEnemies: number;
  readonly remainingCoreHealth: number;
  readonly coreMaxHealth: number;
}

export interface DefenseSortieReward {
  readonly basePoints: number;
  readonly killBonus: number;
  readonly coreHealthBonus: number;
  readonly totalPoints: number;
  readonly killRate: number;
  readonly coreHealthRate: number;
}

export interface DefensePerformanceRewardPolicy {
  rewardFor(
    roundNumber: number,
    performance: DefensePerformanceSnapshot,
  ): DefenseSortieReward;
}

export class WeightedDefensePerformanceRewardPolicy
  implements DefensePerformanceRewardPolicy
{
  public constructor(
    private readonly roundBudgetPolicy: SortiePointPolicy,
    private readonly basePointOffset: number,
    private readonly maximumKillBonus: number,
    private readonly maximumCoreHealthBonus: number,
  ) {
    const values = [
      basePointOffset,
      maximumKillBonus,
      maximumCoreHealthBonus,
    ];
    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error('Defense reward settings must be non-negative integers.');
    }
  }

  public rewardFor(
    roundNumber: number,
    performance: DefensePerformanceSnapshot,
  ): DefenseSortieReward {
    this.validatePerformance(performance);
    const totalEnemies =
      performance.defeatedEnemies + performance.breachedEnemies;
    const killRate = performance.defeatedEnemies / totalEnemies;
    const coreHealthRate =
      performance.remainingCoreHealth / performance.coreMaxHealth;
    const basePoints = Math.max(
      1,
      this.roundBudgetPolicy.pointsForRound(roundNumber) -
        this.basePointOffset,
    );
    const killBonus = Math.floor(killRate * this.maximumKillBonus);
    const coreHealthBonus = Math.floor(
      coreHealthRate * this.maximumCoreHealthBonus,
    );

    return {
      basePoints,
      killBonus,
      coreHealthBonus,
      totalPoints: basePoints + killBonus + coreHealthBonus,
      killRate,
      coreHealthRate,
    };
  }

  private validatePerformance(
    performance: DefensePerformanceSnapshot,
  ): void {
    const enemyCounts = [
      performance.defeatedEnemies,
      performance.breachedEnemies,
    ];
    if (
      enemyCounts.some((value) => !Number.isInteger(value) || value < 0) ||
      performance.defeatedEnemies + performance.breachedEnemies <= 0 ||
      !Number.isFinite(performance.remainingCoreHealth) ||
      !Number.isFinite(performance.coreMaxHealth) ||
      performance.coreMaxHealth <= 0 ||
      performance.remainingCoreHealth < 0 ||
      performance.remainingCoreHealth > performance.coreMaxHealth
    ) {
      throw new Error('Defense performance values are invalid.');
    }
  }
}
