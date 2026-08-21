import { describe, expect, it } from 'vitest';
import type {
  LeaderboardEntrySnapshot,
  LeaderboardSnapshot,
} from '../domain/leaderboard/Leaderboard';
import type { LeaderboardRepository } from '../ports/LeaderboardRepository';
import type { PlayerIdentityProvider } from '../ports/PlayerIdentityProvider';
import { LeaderboardService } from './LeaderboardService';

class StubIdentityProvider implements PlayerIdentityProvider {
  public getPlayerId(): string {
    return 'current-player';
  }
}

class InMemoryLeaderboardRepository implements LeaderboardRepository {
  public readonly entries: LeaderboardEntrySnapshot[] = [];

  public constructor(public readonly isConfigured = true) {}

  public async load(playerId: string, limit: number): Promise<LeaderboardSnapshot> {
    const { Leaderboard } = await import('../domain/leaderboard/Leaderboard');
    return Leaderboard.fromEntries(this.entries, playerId, limit).snapshot;
  }

  public async submit(entry: LeaderboardEntrySnapshot): Promise<void> {
    this.entries.push(entry);
  }
}

describe('LeaderboardService', () => {
  it('submits a challenge best and reloads the ranking', async () => {
    const repository = new InMemoryLeaderboardRepository();
    const service = new LeaderboardService(
      repository,
      new StubIdentityProvider(),
    );

    const result = await service.submitChallengeBest('장난감 대장', {
      round: 2,
      attackTimeMs: 45_000,
      achievedAt: '2026-08-19T06:00:00.000Z',
    });

    expect(result.status).toBe('online');
    expect(result.leaderboard?.currentPlayerEntry?.rank).toBe(1);
    expect(repository.entries).toHaveLength(1);
  });

  it('keeps the game offline when the server is not configured', async () => {
    const service = new LeaderboardService(
      new InMemoryLeaderboardRepository(false),
      new StubIdentityProvider(),
    );

    const result = await service.load();

    expect(result.status).toBe('offline');
    expect(result.leaderboard).toBeNull();
  });
});
