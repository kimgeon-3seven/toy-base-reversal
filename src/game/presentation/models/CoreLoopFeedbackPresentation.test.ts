import { describe, expect, it } from 'vitest';
import { DefenseStructure } from '../../domain/structures/DefenseStructure';
import { GridPosition } from '../../domain/grid/GridPosition';
import type { DefenseRoundResult } from '../../domain/rounds/RoundSession';
import { CoreLoopFeedbackPresenter } from './CoreLoopFeedbackPresentation';

const defense: DefenseRoundResult = {
  defeatedEnemies: 8,
  breachedEnemies: 2,
  remainingCoreHealth: 90,
  coreMaxHealth: 120,
  sortieReward: {
    basePoints: 21,
    killBonus: 4,
    coreHealthBonus: 2,
    totalPoints: 27,
    killRate: 0.8,
    coreHealthRate: 0.75,
  },
};

describe('CoreLoopFeedbackPresenter', () => {
  const presenter = new CoreLoopFeedbackPresenter();

  it('connects defense performance bars to attack resources', () => {
    const result = presenter.presentDefense(defense);

    expect(result.progress).toEqual([
      { label: '처치율', ratio: 0.8, detail: '80% · +4P' },
      { label: '코어 보존', ratio: 0.75, detail: '75% · +2P' },
    ]);
    expect(result.bridgeMessage).toContain('27P');
  });

  it('summarizes the restored defense and only available counters', () => {
    const structures = [
      new DefenseStructure(
        'popgun-1',
        'tower',
        new GridPosition(4, 4),
        100,
        'popgun',
      ),
      new DefenseStructure(
        'mortar-1',
        'tower',
        new GridPosition(7, 4),
        100,
        'mortar',
      ),
      new DefenseStructure(
        'wall-1',
        'obstacle',
        new GridPosition(8, 4),
        100,
        null,
      ),
    ];

    const brief = presenter.presentAttackPreparation(
      structures,
      defense,
      ['tank'],
    );

    expect(brief.defenseSummary).toContain('블록 박격포 1');
    expect(brief.defenseSummary).toContain('블록 벽 1');
    expect(brief.counterSummary).toBe('추천 · 방패병→팝건');
    expect(brief.rewardSummary).toContain('= 27P');
  });

  it('compares both sides of a completed round', () => {
    const result = presenter.presentCompletion(
      { roundNumber: 1, defense, attackTimeMs: 42_100 },
      'A',
    );

    expect(result.title).toContain('양쪽 모두 승리');
    expect(result.comparison[0]).toContain('방어 A등급');
    expect(result.comparison[1]).toContain('공략 42.1초');
  });
});
