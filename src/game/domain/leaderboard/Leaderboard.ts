export interface LeaderboardEntrySnapshot {
  readonly playerId: string;
  readonly playerName: string;
  readonly challengeRound: number;
  readonly attackTimeMs: number;
  readonly achievedAt: string;
}

export interface RankedLeaderboardEntry extends LeaderboardEntrySnapshot {
  readonly rank: number;
}

export interface LeaderboardSnapshot {
  readonly topEntries: readonly RankedLeaderboardEntry[];
  readonly currentPlayerEntry: RankedLeaderboardEntry | null;
}

export class Leaderboard {
  private constructor(private readonly data: LeaderboardSnapshot) {}

  public static fromEntries(
    entries: readonly LeaderboardEntrySnapshot[],
    currentPlayerId: string,
    limit = 10,
  ): Leaderboard {
    Leaderboard.validatePlayerId(currentPlayerId);
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new Error('Leaderboard limit must be between 1 and 100.');
    }

    const bestByPlayer = new Map<string, LeaderboardEntrySnapshot>();
    for (const rawEntry of entries) {
      const entry = Leaderboard.validateEntry(rawEntry);
      const current = bestByPlayer.get(entry.playerId);
      if (current === undefined || Leaderboard.compareEntries(entry, current) < 0) {
        bestByPlayer.set(entry.playerId, entry);
      }
    }

    const ranked = [...bestByPlayer.values()]
      .sort(Leaderboard.compareEntries)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return new Leaderboard({
      topEntries: ranked.slice(0, limit),
      currentPlayerEntry:
        ranked.find((entry) => entry.playerId === currentPlayerId) ?? null,
    });
  }

  public static restore(snapshot: LeaderboardSnapshot): Leaderboard {
    const topEntries = snapshot.topEntries.map((entry) =>
      Leaderboard.validateRankedEntry(entry),
    );
    const currentPlayerEntry =
      snapshot.currentPlayerEntry === null
        ? null
        : Leaderboard.validateRankedEntry(snapshot.currentPlayerEntry);
    return new Leaderboard({ topEntries, currentPlayerEntry });
  }

  public get topEntries(): readonly RankedLeaderboardEntry[] {
    return this.data.topEntries.map((entry) => ({ ...entry }));
  }

  public get currentPlayerEntry(): RankedLeaderboardEntry | null {
    return this.data.currentPlayerEntry === null
      ? null
      : { ...this.data.currentPlayerEntry };
  }

  public get snapshot(): LeaderboardSnapshot {
    return {
      topEntries: this.topEntries,
      currentPlayerEntry: this.currentPlayerEntry,
    };
  }

  private static compareEntries(
    left: LeaderboardEntrySnapshot,
    right: LeaderboardEntrySnapshot,
  ): number {
    return (
      right.challengeRound - left.challengeRound ||
      left.attackTimeMs - right.attackTimeMs ||
      Date.parse(left.achievedAt) - Date.parse(right.achievedAt) ||
      left.playerName.localeCompare(right.playerName, 'ko-KR')
    );
  }

  private static validateRankedEntry(
    entry: RankedLeaderboardEntry,
  ): RankedLeaderboardEntry {
    if (!Number.isInteger(entry.rank) || entry.rank <= 0) {
      throw new Error('Leaderboard rank must be a positive integer.');
    }
    return { ...Leaderboard.validateEntry(entry), rank: entry.rank };
  }

  private static validateEntry(
    entry: LeaderboardEntrySnapshot,
  ): LeaderboardEntrySnapshot {
    const playerId = Leaderboard.validatePlayerId(entry.playerId);
    const playerName = entry.playerName.trim();
    if (playerName.length === 0 || playerName.length > 24) {
      throw new Error('Leaderboard player name must contain 1 to 24 characters.');
    }
    if (!Number.isInteger(entry.challengeRound) || entry.challengeRound <= 0) {
      throw new Error('Leaderboard challenge round must be positive.');
    }
    if (
      !Number.isFinite(entry.attackTimeMs) ||
      entry.attackTimeMs <= 0 ||
      entry.attackTimeMs > 90_000
    ) {
      throw new Error('Leaderboard attack time must be between 1 and 90000 ms.');
    }
    if (Number.isNaN(Date.parse(entry.achievedAt))) {
      throw new Error('Leaderboard achievement date must be valid.');
    }
    return { ...entry, playerId, playerName };
  }

  private static validatePlayerId(playerId: string): string {
    const normalized = playerId.trim();
    if (normalized.length === 0 || normalized.length > 128) {
      throw new Error('Leaderboard player id must contain 1 to 128 characters.');
    }
    return normalized;
  }
}
