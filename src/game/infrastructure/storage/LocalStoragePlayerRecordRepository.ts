import type { PlayerRecordSnapshot } from '../../domain/records/PlayerRecord';
import type { PlayerRecordRepository } from '../../ports/PlayerRecordRepository';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PLAYER_RECORD_STORAGE_KEY = 'toy-base-reversal.player-record.v1';

export class LocalStoragePlayerRecordRepository
  implements PlayerRecordRepository
{
  public constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = PLAYER_RECORD_STORAGE_KEY,
  ) {}

  public load(): PlayerRecordSnapshot | null {
    const serialized = this.storage.getItem(this.storageKey);
    return serialized === null
      ? null
      : (JSON.parse(serialized) as PlayerRecordSnapshot);
  }

  public save(record: PlayerRecordSnapshot): void {
    this.storage.setItem(this.storageKey, JSON.stringify(record));
  }

  public clear(): void {
    this.storage.removeItem(this.storageKey);
  }
}
