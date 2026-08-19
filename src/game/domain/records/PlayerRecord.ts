export interface NormalBestRecord {
  readonly totalAttackTimeMs: number;
  readonly achievedAt: string;
}

export interface ChallengeBestRecord {
  readonly round: number;
  readonly attackTimeMs: number;
  readonly achievedAt: string;
}

export interface PlayerRecordSnapshot {
  readonly version: 1;
  readonly playerName: string;
  readonly normalBest: NormalBestRecord | null;
  readonly challengeBest: ChallengeBestRecord | null;
}

export interface PlayerRecordUpdate {
  readonly record: PlayerRecord;
  readonly isNewBest: boolean;
}

export class PlayerRecord {
  private constructor(private readonly data: PlayerRecordSnapshot) {}

  public static create(playerName: string): PlayerRecord {
    return new PlayerRecord({
      version: 1,
      playerName: PlayerRecord.validatePlayerName(playerName),
      normalBest: null,
      challengeBest: null,
    });
  }

  public static restore(snapshot: PlayerRecordSnapshot): PlayerRecord {
    if (snapshot.version !== 1) {
      throw new Error('Unsupported player record version.');
    }
    const playerName = PlayerRecord.validatePlayerName(snapshot.playerName);
    const normalBest =
      snapshot.normalBest === null
        ? null
        : {
            totalAttackTimeMs: PlayerRecord.validatePositiveNumber(
              snapshot.normalBest.totalAttackTimeMs,
              'Normal clear time',
            ),
            achievedAt: PlayerRecord.validateDate(snapshot.normalBest.achievedAt),
          };
    const challengeBest =
      snapshot.challengeBest === null
        ? null
        : {
            round: PlayerRecord.validateRound(snapshot.challengeBest.round),
            attackTimeMs: PlayerRecord.validatePositiveNumber(
              snapshot.challengeBest.attackTimeMs,
              'Challenge clear time',
            ),
            achievedAt: PlayerRecord.validateDate(
              snapshot.challengeBest.achievedAt,
            ),
          };

    return new PlayerRecord({
      version: 1,
      playerName,
      normalBest,
      challengeBest,
    });
  }

  public get playerName(): string {
    return this.data.playerName;
  }

  public get normalBest(): NormalBestRecord | null {
    return this.data.normalBest === null ? null : { ...this.data.normalBest };
  }

  public get challengeBest(): ChallengeBestRecord | null {
    return this.data.challengeBest === null
      ? null
      : { ...this.data.challengeBest };
  }

  public get snapshot(): PlayerRecordSnapshot {
    return {
      version: 1,
      playerName: this.data.playerName,
      normalBest: this.normalBest,
      challengeBest: this.challengeBest,
    };
  }

  public recordNormalCompletion(
    totalAttackTimeMs: number,
    achievedAt: string,
  ): PlayerRecordUpdate {
    const clearTime = PlayerRecord.validatePositiveNumber(
      totalAttackTimeMs,
      'Normal clear time',
    );
    const date = PlayerRecord.validateDate(achievedAt);
    if (
      this.data.normalBest !== null &&
      this.data.normalBest.totalAttackTimeMs <= clearTime
    ) {
      return { record: this, isNewBest: false };
    }

    return {
      record: new PlayerRecord({
        ...this.data,
        normalBest: { totalAttackTimeMs: clearTime, achievedAt: date },
      }),
      isNewBest: true,
    };
  }

  public recordChallengeCompletion(
    round: number,
    attackTimeMs: number,
    achievedAt: string,
  ): PlayerRecordUpdate {
    const challengeRound = PlayerRecord.validateRound(round);
    const clearTime = PlayerRecord.validatePositiveNumber(
      attackTimeMs,
      'Challenge clear time',
    );
    const date = PlayerRecord.validateDate(achievedAt);
    const current = this.data.challengeBest;
    const isBetter =
      current === null ||
      challengeRound > current.round ||
      (challengeRound === current.round && clearTime < current.attackTimeMs);
    if (!isBetter) {
      return { record: this, isNewBest: false };
    }

    return {
      record: new PlayerRecord({
        ...this.data,
        challengeBest: {
          round: challengeRound,
          attackTimeMs: clearTime,
          achievedAt: date,
        },
      }),
      isNewBest: true,
    };
  }

  private static validatePlayerName(playerName: string): string {
    const normalized = playerName.trim();
    if (normalized.length === 0 || normalized.length > 24) {
      throw new Error('Player name must contain 1 to 24 characters.');
    }
    return normalized;
  }

  private static validatePositiveNumber(value: number, label: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be positive.`);
    }
    return value;
  }

  private static validateRound(round: number): number {
    if (!Number.isInteger(round) || round <= 0) {
      throw new Error('Challenge round must be a positive integer.');
    }
    return round;
  }

  private static validateDate(value: string): string {
    if (Number.isNaN(Date.parse(value))) {
      throw new Error('Record date must be valid.');
    }
    return value;
  }
}
