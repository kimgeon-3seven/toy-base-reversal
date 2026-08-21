import type {
  LeaderboardEntrySnapshot,
  LeaderboardSnapshot,
} from '../domain/leaderboard/Leaderboard';

export interface LeaderboardRepository {
  readonly isConfigured: boolean;
  load(playerId: string, limit: number): Promise<LeaderboardSnapshot>;
  submit(entry: LeaderboardEntrySnapshot): Promise<void>;
}
