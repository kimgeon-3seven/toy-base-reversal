import type {
  LeaderboardEntrySnapshot,
  LeaderboardSnapshot,
} from '../../domain/leaderboard/Leaderboard';
import type { LeaderboardRepository } from '../../ports/LeaderboardRepository';

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type LeaderboardFetch = (
  input: string,
  init?: RequestInit,
) => Promise<HttpResponse>;

export class HttpLeaderboardRepository implements LeaderboardRepository {
  public readonly isConfigured = true;

  public constructor(
    private readonly endpoint: string,
    private readonly publishableKey: string,
    private readonly fetchRequest: LeaderboardFetch = fetch,
  ) {
    if (endpoint.trim().length === 0 || publishableKey.trim().length === 0) {
      throw new Error('Leaderboard endpoint and publishable key are required.');
    }
  }

  public async load(
    playerId: string,
    limit: number,
  ): Promise<LeaderboardSnapshot> {
    const url = new URL(this.endpoint);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('limit', String(limit));
    const response = await this.fetchRequest(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(`Leaderboard request failed with ${response.status}.`);
    }
    return (await response.json()) as LeaderboardSnapshot;
  }

  public async submit(entry: LeaderboardEntrySnapshot): Promise<void> {
    const response = await this.fetchRequest(this.endpoint, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(entry),
    });
    if (!response.ok) {
      throw new Error(`Leaderboard submission failed with ${response.status}.`);
    }
  }

  private headers(): Readonly<Record<string, string>> {
    return {
      apikey: this.publishableKey,
      'content-type': 'application/json',
    };
  }
}
