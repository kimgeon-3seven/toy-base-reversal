import { describe, expect, it } from 'vitest';
import { RoundSession } from './RoundSession';

describe('RoundSession', () => {
  it('records defense and attack results before advancing', () => {
    const session = new RoundSession(2);

    session.recordDefenseVictory({
      defeatedEnemies: 9,
      remainingCoreHealth: 80,
    });
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
      session.recordDefenseVictory({
        defeatedEnemies: 9 + round,
        remainingCoreHealth: 100,
      });
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
});
