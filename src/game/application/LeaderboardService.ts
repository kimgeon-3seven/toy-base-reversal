import {
  Leaderboard,
  type LeaderboardEntrySnapshot,
} from '../domain/leaderboard/Leaderboard';
import type { ChallengeBestRecord } from '../domain/records/PlayerRecord';
import type { LeaderboardRepository } from '../ports/LeaderboardRepository';
import type { PlayerIdentityProvider } from '../ports/PlayerIdentityProvider';

export interface LeaderboardResult {
  readonly status: 'online' | 'offline';
  readonly leaderboard: Leaderboard | null;
  readonly message: string;
}

export class LeaderboardService {
  public constructor(
    private readonly repository: LeaderboardRepository,
    private readonly identityProvider: PlayerIdentityProvider,
  ) {}

  public get isConfigured(): boolean {
    return this.repository.isConfigured;
  }

  public async load(limit = 10): Promise<LeaderboardResult> {
    if (!this.repository.isConfigured) return this.offlineResult();
    try {
      const playerId = this.identityProvider.getPlayerId();
      return {
        status: 'online',
        leaderboard: Leaderboard.restore(
          await this.repository.load(playerId, limit),
        ),
        message: '온라인 순위표를 불러왔습니다.',
      };
    } catch {
      return {
        status: 'offline',
        leaderboard: null,
        message: '순위표 서버에 연결하지 못했습니다. 로컬 기록은 유지됩니다.',
      };
    }
  }

  public async submitChallengeBest(
    playerName: string,
    best: ChallengeBestRecord,
  ): Promise<LeaderboardResult> {
    if (!this.repository.isConfigured) return this.offlineResult();
    const entry: LeaderboardEntrySnapshot = {
      playerId: this.identityProvider.getPlayerId(),
      playerName,
      challengeRound: best.round,
      attackTimeMs: best.attackTimeMs,
      achievedAt: best.achievedAt,
    };
    try {
      Leaderboard.fromEntries([entry], entry.playerId);
      await this.repository.submit(entry);
      return await this.load();
    } catch {
      return {
        status: 'offline',
        leaderboard: null,
        message: '신기록을 서버에 제출하지 못했습니다. 로컬 기록은 유지됩니다.',
      };
    }
  }

  private offlineResult(): LeaderboardResult {
    return {
      status: 'offline',
      leaderboard: null,
      message: '온라인 순위표가 아직 연결되지 않았습니다. 로컬 기록만 사용합니다.',
    };
  }
}
