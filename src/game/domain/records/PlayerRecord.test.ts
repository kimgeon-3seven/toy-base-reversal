import { describe, expect, it } from 'vitest';
import { PlayerRecord } from './PlayerRecord';

const FIRST_DATE = '2026-08-19T06:00:00.000Z';
const SECOND_DATE = '2026-08-19T07:00:00.000Z';

describe('PlayerRecord', () => {
  it('keeps only the fastest normal-mode completion', () => {
    const initial = PlayerRecord.create(' 로컬 플레이어 ');
    const first = initial.recordNormalCompletion(150_000, FIRST_DATE);
    const slower = first.record.recordNormalCompletion(160_000, SECOND_DATE);
    const faster = slower.record.recordNormalCompletion(140_000, SECOND_DATE);

    expect(initial.playerName).toBe('로컬 플레이어');
    expect(first.isNewBest).toBe(true);
    expect(slower.isNewBest).toBe(false);
    expect(faster.isNewBest).toBe(true);
    expect(faster.record.normalBest).toEqual({
      totalAttackTimeMs: 140_000,
      achievedAt: SECOND_DATE,
    });
  });

  it('prioritizes challenge round before clear time', () => {
    const initial = PlayerRecord.create('로컬 플레이어');
    const first = initial.recordChallengeCompletion(2, 45_000, FIRST_DATE);
    const lowerRound = first.record.recordChallengeCompletion(
      1,
      20_000,
      SECOND_DATE,
    );
    const fasterTie = lowerRound.record.recordChallengeCompletion(
      2,
      40_000,
      SECOND_DATE,
    );
    const higherRound = fasterTie.record.recordChallengeCompletion(
      3,
      80_000,
      SECOND_DATE,
    );

    expect(lowerRound.isNewBest).toBe(false);
    expect(fasterTie.isNewBest).toBe(true);
    expect(higherRound.isNewBest).toBe(true);
    expect(higherRound.record.challengeBest).toEqual({
      round: 3,
      attackTimeMs: 80_000,
      achievedAt: SECOND_DATE,
    });
  });

  it('restores and validates a persisted snapshot', () => {
    const source = PlayerRecord.create('로컬 플레이어').recordChallengeCompletion(
      4,
      55_000,
      FIRST_DATE,
    ).record;

    expect(PlayerRecord.restore(source.snapshot).snapshot).toEqual(
      source.snapshot,
    );
    expect(() =>
      PlayerRecord.restore({
        ...source.snapshot,
        challengeBest: {
          round: 0,
          attackTimeMs: 55_000,
          achievedAt: FIRST_DATE,
        },
      }),
    ).toThrow('Challenge round must be a positive integer.');
  });

  it('renames the player without losing best records', () => {
    const source = PlayerRecord.create('로컬 플레이어').recordNormalCompletion(
      120_000,
      FIRST_DATE,
    ).record;

    const renamed = source.rename(' 장난감 대장 ');

    expect(renamed.playerName).toBe('장난감 대장');
    expect(renamed.normalBest).toEqual(source.normalBest);
  });
});
