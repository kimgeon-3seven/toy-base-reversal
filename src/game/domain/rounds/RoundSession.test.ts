import { describe, expect, it } from 'vitest';
import { RoundSession } from './RoundSession';

function defenseResult(
  defeatedEnemies: number,
  remainingCoreHealth: number,
) {
  return {
    defeatedEnemies,
    breachedEnemies: 2,
    remainingCoreHealth,
    coreMaxHealth: 120,
    sortieReward: {
      basePoints: 21,
      killBonus: 3,
      coreHealthBonus: 1,
      totalPoints: 25,
      killRate: defeatedEnemies / (defeatedEnemies + 2),
      coreHealthRate: remainingCoreHealth / 120,
    },
  };
}

describe('RoundSession', () => {
  it('records defense and attack results before advancing', () => {
    const session = new RoundSession(2);

    session.recordDefenseVictory(defenseResult(9, 80));
    const result = session.recordAttackVictory(42_500);

    expect(result.roundNumber).toBe(1);
    expect(session.completedRounds).toEqual([result]);
    expect(session.totalAttackTimeMs).toBe(42_500);
    expect(session.advanceToNextRound()).toBe(true);
    expect(session.currentRound).toBe(2);
  });

  it('completes normal mode after the configured number of rounds', () => {
    const session = new RoundSession(5);
    for (let round = 1; round <= 5; round += 1) {
      session.recordDefenseVictory(defenseResult(9 + round, 100));
      session.recordAttackVictory(round * 10_000);
      if (round < 5) {
        expect(session.advanceToNextRound()).toBe(true);
      }
    }

    expect(session.isNormalModeComplete).toBe(true);
    expect(session.completedRounds).toHaveLength(5);
    expect(session.totalAttackTimeMs).toBe(150_000);
    expect(session.advanceToNextRound()).toBe(false);
    expect(session.currentRound).toBe(5);
  });

  it('rejects attack results before a defense victory', () => {
    const session = new RoundSession();

    expect(() => session.recordAttackVictory(10_000)).toThrow(
      'Defense must be completed',
    );
  });

  it('enters challenge mode explicitly and then advances without a round cap', () => {
    const session = new RoundSession(2);
    for (let round = 1; round <= 2; round += 1) {
      session.recordDefenseVictory(defenseResult(10, 60));
      session.recordAttackVictory(round * 10_000);
      if (round < 2) session.advanceToNextRound();
    }

    expect(session.mode).toBe('normal');
    expect(session.challengeRound).toBe(0);
    expect(session.enterChallengeMode()).toBe(true);
    expect(session.mode).toBe('challenge');
    expect(session.currentRound).toBe(3);
    expect(session.challengeRound).toBe(1);

    session.recordDefenseVictory(defenseResult(20, 40));
    session.recordAttackVictory(55_000);

    expect(session.completedChallengeRounds).toHaveLength(1);
    expect(session.highestCompletedChallengeRound).toBe(1);
    expect(session.latestChallengeAttackTimeMs).toBe(55_000);
    expect(session.advanceToNextRound()).toBe(true);
    expect(session.challengeRound).toBe(2);
  });

  it('rejects challenge entry before normal mode is complete', () => {
    const session = new RoundSession();

    expect(() => session.enterChallengeMode()).toThrow(
      'Normal mode must be completed',
    );
  });

  it('restores completed rounds, cumulative time, and a pending defense result', () => {
    const original = new RoundSession(5);
    original.recordDefenseVictory(defenseResult(9, 90));
    original.recordAttackVictory(31_000);
    original.advanceToNextRound();
    original.recordDefenseVictory(defenseResult(12, 75));

    const restored = RoundSession.restore(original.snapshot);

    expect(restored.currentRound).toBe(2);
    expect(restored.totalAttackTimeMs).toBe(31_000);
    expect(restored.currentDefenseResult).toEqual(defenseResult(12, 75));
  });

  it('rejects a saved round that skips its completed round sequence', () => {
    expect(() =>
      RoundSession.restore({
        normalRoundCount: 5,
        currentRound: 3,
        pendingDefenseResult: null,
        completedRounds: [],
      }),
    ).toThrow('does not match completed rounds');
  });
});
