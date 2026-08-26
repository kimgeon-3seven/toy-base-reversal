import { describe, expect, it } from 'vitest';
import { DefenseBlueprint } from '../battlefield/DefenseBlueprint';
import { DefenseStructure } from '../structures/DefenseStructure';
import { GridPosition } from '../grid/GridPosition';
import { RoundSession } from '../rounds/RoundSession';
import { SquadPlan } from '../attack/SquadPlan';
import { CampaignCheckpoint } from './CampaignCheckpoint';

const defenseResult = {
  defeatedEnemies: 8,
  breachedEnemies: 2,
  remainingCoreHealth: 80,
  coreMaxHealth: 100,
  sortieReward: {
    basePoints: 18,
    killBonus: 4,
    coreHealthBonus: 2,
    totalPoints: 24,
    killRate: 0.8,
    coreHealthRate: 0.8,
  },
};

function blueprint(): DefenseBlueprint {
  return DefenseBlueprint.capture([
    new DefenseStructure(
      'structure-1',
      'tower',
      new GridPosition(2, 2),
      120,
      'popgun',
      2,
    ),
  ]);
}

describe('CampaignCheckpoint', () => {
  it('round-trips a defense preparation checkpoint', () => {
    const session = new RoundSession(5);
    const checkpoint = CampaignCheckpoint.create(
      'defense-preparation',
      session,
      blueprint(),
      11,
      null,
      '2026-08-26T10:00:00.000Z',
    );

    const restored = CampaignCheckpoint.restore(checkpoint.snapshot);

    expect(restored.roundSession.currentRound).toBe(1);
    expect(restored.constructionFunds).toBe(11);
    expect(restored.defenseBlueprint.snapshot.structures[0]?.upgradeLevel).toBe(
      2,
    );
  });

  it('requires the pending defense reward and matching squad for attack preparation', () => {
    const session = new RoundSession(5);
    session.recordDefenseVictory(defenseResult);
    const squad = new SquadPlan(24, 2, 3);
    squad.addUnit(1, 'tank');

    const checkpoint = CampaignCheckpoint.create(
      'attack-preparation',
      session,
      blueprint(),
      8,
      squad,
      '2026-08-26T10:00:00.000Z',
    );

    expect(checkpoint.squadPlan?.lanes[1]).toEqual(['tank']);
    expect(checkpoint.roundSession.isDefenseComplete).toBe(true);
  });

  it('rejects challenge and phase-inconsistent saves', () => {
    const session = new RoundSession(1);
    session.recordDefenseVictory(defenseResult);
    session.recordAttackVictory(20_000);
    session.enterChallengeMode();

    expect(() =>
      CampaignCheckpoint.create(
        'defense-preparation',
        session,
        blueprint(),
        5,
        null,
        '2026-08-26T10:00:00.000Z',
      ),
    ).toThrow('active normal campaign');
  });
});
