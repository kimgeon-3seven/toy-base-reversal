import { describe, expect, it } from 'vitest';
import type { DefenseRoundResult } from '../../domain/rounds/RoundSession';
import { DefenseRewardPresenter } from './DefenseRewardPresentation';

function result(
  killRate: number,
  coreHealthRate: number,
): DefenseRoundResult {
  return {
    defeatedEnemies: Math.round(killRate * 10),
    breachedEnemies: Math.round((1 - killRate) * 10),
    remainingCoreHealth: Math.round(coreHealthRate * 120),
    coreMaxHealth: 120,
    sortieReward: {
      basePoints: 21,
      killBonus: Math.floor(killRate * 5),
      coreHealthBonus: Math.floor(coreHealthRate * 3),
      totalPoints: 21 + Math.floor(killRate * 5) + Math.floor(coreHealthRate * 3),
      killRate,
      coreHealthRate,
    },
  };
}

describe('DefenseRewardPresenter', () => {
  it('turns a clean defense into an S-grade attack reward summary', () => {
    const presentation = new DefenseRewardPresenter().present(result(1, 1));

    expect(presentation.grade).toBe('S');
    expect(presentation.headline).toContain('29');
    expect(presentation.breakdown).toBe('기본 21 + 처치 5 + 코어 3');
  });

  it('communicates a damaged defense as a lower grade', () => {
    expect(new DefenseRewardPresenter().present(result(0.5, 0.3)).grade).toBe('C');
  });
});
