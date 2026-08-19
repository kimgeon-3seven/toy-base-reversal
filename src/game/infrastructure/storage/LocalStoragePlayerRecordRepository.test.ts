import { describe, expect, it } from 'vitest';
import { PlayerRecord } from '../../domain/records/PlayerRecord';
import { LocalStoragePlayerRecordRepository } from './LocalStoragePlayerRecordRepository';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('LocalStoragePlayerRecordRepository', () => {
  it('serializes, loads, and clears a record', () => {
    const repository = new LocalStoragePlayerRecordRepository(
      new MemoryStorage(),
      'test-record',
    );
    const snapshot = PlayerRecord.create('로컬 플레이어').recordNormalCompletion(
      120_000,
      '2026-08-19T06:00:00.000Z',
    ).record.snapshot;

    repository.save(snapshot);
    expect(repository.load()).toEqual(snapshot);

    repository.clear();
    expect(repository.load()).toBeNull();
  });
});
