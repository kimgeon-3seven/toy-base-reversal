import { describe, expect, it } from 'vitest';
import { HttpLeaderboardRepository } from './HttpLeaderboardRepository';
import { LeaderboardRepositoryFactory } from './LeaderboardRepositoryFactory';
import { UnavailableLeaderboardRepository } from './UnavailableLeaderboardRepository';

describe('LeaderboardRepositoryFactory', () => {
  const factory = new LeaderboardRepositoryFactory();

  it.each([
    {},
    { endpoint: '', publishableKey: '' },
    { endpoint: '   ', publishableKey: 'key' },
    { endpoint: 'https://example.supabase.co/functions/v1/leaderboard' },
  ])('uses the unavailable repository for incomplete configuration', (config) => {
    expect(factory.create(config)).toBeInstanceOf(
      UnavailableLeaderboardRepository,
    );
  });

  it('uses the HTTP repository when both values are configured', () => {
    expect(
      factory.create({
        endpoint: ' https://example.supabase.co/functions/v1/leaderboard ',
        publishableKey: ' public-key ',
      }),
    ).toBeInstanceOf(HttpLeaderboardRepository);
  });
});
