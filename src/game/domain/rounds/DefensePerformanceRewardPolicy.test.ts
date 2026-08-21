import { describe, expect, it } from 'vitest';
import { LinearSortiePointPolicy } from '../attack/SortiePointPolicy';
import { WeightedDefensePerformanceRewardPolicy } from './DefensePerformanceRewardPolicy';

describe('WeightedDefensePerformanceRewardPolicy', () => {
  const policy = new WeightedDefensePerformanceRewardPolicy(
    new LinearSortiePointPolicy(24, 3),
    3,
    5,
    3,
  );

  it('keeps the prototype baseline near its former fixed budget', () => {
    expect(
      policy.rewardFor(1, {
        defeatedEnemies: 5,
        breachedEnemies: 4,
        remainingCoreHealth: 40,
        coreMaxHealth: 120,
      }),
    ).toEqual({
      basePoints: 21,
      killBonus: 2,
      coreHealthBonus: 1,
      totalPoints: 24,
      killRate: 5 / 9,
      coreHealthRate: 1 / 3,
    });
  });

  it('rewards a perfect defense without removing the minimum attack budget', () => {
    const perfect = policy.rewardFor(2, {
      defeatedEnemies: 12,
      breachedEnemies: 0,
      remainingCoreHealth: 120,
      coreMaxHealth: 120,
    });
    const narrow = policy.rewardFor(2, {
      defeatedEnemies: 1,
      breachedEnemies: 11,
      remainingCoreHealth: 1,
      coreMaxHealth: 120,
    });

    expect(perfect.totalPoints).toBe(32);
    expect(narrow.totalPoints).toBe(24);
  });

  it('rejects impossible defense results', () => {
    expect(() =>
      policy.rewardFor(1, {
        defeatedEnemies: 0,
        breachedEnemies: 0,
        remainingCoreHealth: 120,
        coreMaxHealth: 120,
      }),
    ).toThrow('Defense performance values are invalid');
  });
});
