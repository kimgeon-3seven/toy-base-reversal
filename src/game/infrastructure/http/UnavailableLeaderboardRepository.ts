import type { LeaderboardSnapshot } from '../../domain/leaderboard/Leaderboard';
import type { LeaderboardRepository } from '../../ports/LeaderboardRepository';

export class UnavailableLeaderboardRepository
  implements LeaderboardRepository
{
  public readonly isConfigured = false;

  public load(): Promise<LeaderboardSnapshot> {
    return Promise.reject(new Error('Leaderboard is not configured.'));
  }

  public submit(): Promise<void> {
    return Promise.reject(new Error('Leaderboard is not configured.'));
  }
}
