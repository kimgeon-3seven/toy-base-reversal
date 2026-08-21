import type { LeaderboardRepository } from '../../ports/LeaderboardRepository';
import { HttpLeaderboardRepository } from './HttpLeaderboardRepository';
import { UnavailableLeaderboardRepository } from './UnavailableLeaderboardRepository';

export interface LeaderboardConfiguration {
  readonly endpoint?: string;
  readonly publishableKey?: string;
}

export class LeaderboardRepositoryFactory {
  public create(
    configuration: LeaderboardConfiguration,
  ): LeaderboardRepository {
    const endpoint = configuration.endpoint?.trim();
    const publishableKey = configuration.publishableKey?.trim();

    if (!endpoint || !publishableKey) {
      return new UnavailableLeaderboardRepository();
    }

    return new HttpLeaderboardRepository(endpoint, publishableKey);
  }
}
