import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntrySnapshot } from '../../domain/leaderboard/Leaderboard';
import { HttpLeaderboardRepository } from './HttpLeaderboardRepository';

const entry: LeaderboardEntrySnapshot = {
  playerId: 'player-one',
  playerName: '장난감 대장',
  challengeRound: 2,
  attackTimeMs: 45_000,
  achievedAt: '2026-08-19T06:00:00.000Z',
};

describe('HttpLeaderboardRepository', () => {
  it('loads a ranked response with public-key authentication', async () => {
    const fetchRequest = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        topEntries: [{ ...entry, rank: 1 }],
        currentPlayerEntry: { ...entry, rank: 1 },
      }),
    }));
    const repository = new HttpLeaderboardRepository(
      'https://example.supabase.co/functions/v1/leaderboard',
      'sb_publishable_test',
      fetchRequest,
    );

    const result = await repository.load('player-one', 10);

    expect(result.currentPlayerEntry?.rank).toBe(1);
    expect(fetchRequest).toHaveBeenCalledWith(
      expect.stringContaining('playerId=player-one'),
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: 'sb_publishable_test' }),
      }),
    );
  });

  it('submits a local best as JSON', async () => {
    const fetchRequest = vi.fn(async () => ({
      ok: true,
      status: 204,
      json: async () => null,
    }));
    const repository = new HttpLeaderboardRepository(
      'https://example.supabase.co/functions/v1/leaderboard',
      'sb_publishable_test',
      fetchRequest,
    );

    await repository.submit(entry);

    expect(fetchRequest).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/leaderboard',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(entry) }),
    );
  });
});
