import {
  PlayerRecord,
  type PlayerRecordUpdate,
} from '../domain/records/PlayerRecord';
import type { PlayerRecordRepository } from '../ports/PlayerRecordRepository';

export type RecordClock = () => Date;

export class GameRecordService {
  private currentRecord: PlayerRecord;

  public constructor(
    private readonly repository: PlayerRecordRepository,
    private readonly clock: RecordClock = () => new Date(),
    playerName = '로컬 플레이어',
  ) {
    this.currentRecord = this.restoreOrCreate(playerName);
  }

  public get record(): PlayerRecord {
    return this.currentRecord;
  }

  public recordNormalCompletion(totalAttackTimeMs: number): PlayerRecordUpdate {
    const update = this.currentRecord.recordNormalCompletion(
      totalAttackTimeMs,
      this.clock().toISOString(),
    );
    return this.apply(update);
  }

  public recordChallengeCompletion(
    round: number,
    attackTimeMs: number,
  ): PlayerRecordUpdate {
    const update = this.currentRecord.recordChallengeCompletion(
      round,
      attackTimeMs,
      this.clock().toISOString(),
    );
    return this.apply(update);
  }

  public renamePlayer(playerName: string): PlayerRecord {
    const renamed = this.currentRecord.rename(playerName);
    this.currentRecord = renamed;
    try {
      this.repository.save(renamed.snapshot);
    } catch {
      // The renamed identity still applies to the current session.
    }
    return renamed;
  }

  public reset(playerName = this.currentRecord.playerName): PlayerRecord {
    try {
      this.repository.clear();
    } catch {
      // Keep the game playable when browser storage is unavailable.
    }
    this.currentRecord = PlayerRecord.create(playerName);
    return this.currentRecord;
  }

  private apply(update: PlayerRecordUpdate): PlayerRecordUpdate {
    this.currentRecord = update.record;
    if (update.isNewBest) {
      try {
        this.repository.save(this.currentRecord.snapshot);
      } catch {
        // The in-memory record remains available for the current session.
      }
    }
    return update;
  }

  private restoreOrCreate(playerName: string): PlayerRecord {
    try {
      const snapshot = this.repository.load();
      return snapshot === null
        ? PlayerRecord.create(playerName)
        : PlayerRecord.restore(snapshot);
    } catch {
      try {
        this.repository.clear();
      } catch {
        // Ignore unavailable storage and fall back to a fresh local record.
      }
      return PlayerRecord.create(playerName);
    }
  }
}
