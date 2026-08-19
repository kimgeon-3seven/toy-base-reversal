import type { PlayerRecordSnapshot } from '../domain/records/PlayerRecord';

export interface PlayerRecordRepository {
  load(): PlayerRecordSnapshot | null;
  save(record: PlayerRecordSnapshot): void;
  clear(): void;
}
