import { describe, expect, it } from 'vitest';
import { Leaderboard, type LeaderboardEntrySnapshot } from './Leaderboard';

const entries: readonly LeaderboardEntrySnapshot[] = [
  {
    playerId: 'slow-high',
    playerName: '느린 고수',
    challengeRound: 3,
    attackTimeMs: 60_000,
    achievedAt: '2026-08-19T06:00:00.000Z',
  },
  {
    playerId: 'fast-high',
    playerName: '빠른 고수',
    challengeRound: 3,
    attackTimeMs: 50_000,
    achievedAt: '2026-08-19T07:00:00.000Z',
  },
  {
    playerId: 'fast-low',
    playerName: '빠른 초보',
    challengeRound: 2,
    attackTimeMs: 20_000,
    achievedAt: '2026-08-19T08:00:00.000Z',
  },
];

describe('Leaderboard', () => {
  it('ranks higher rounds before faster times', () => {
    const board = Leaderboard.fromEntries(entries, 'slow-high', 2);

    expect(board.topEntries.map((entry) => entry.playerId)).toEqual([
      'fast-high',
      'slow-high',
    ]);
    expect(board.currentPlayerEntry?.rank).toBe(2);
  });

  it('keeps only the best result for each player', () => {
    const board = Leaderboard.fromEntries(
      [
        ...entries,
        {
          ...entries[0]!,
          challengeRound: 1,
          attackTimeMs: 10_000,
        },
      ],
      'slow-high',
    );

    expect(board.topEntries).toHaveLength(3);
    expect(board.currentPlayerEntry?.challengeRound).toBe(3);
  });

  it('rejects impossible client records', () => {
    expect(() =>
      Leaderboard.fromEntries(
        [{ ...entries[0]!, attackTimeMs: 90_001 }],
        'slow-high',
      ),
    ).toThrow('between 1 and 90000');
  });
});
