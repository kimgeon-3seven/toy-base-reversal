import { describe, expect, it } from 'vitest';
import { LocalStorageFirstRunGuideRepository } from './LocalStorageFirstRunGuideRepository';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('LocalStorageFirstRunGuideRepository', () => {
  it('stores completion independently from other game records', () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageFirstRunGuideRepository(storage);

    expect(repository.isCompleted()).toBe(false);
    repository.markCompleted();
    expect(repository.isCompleted()).toBe(true);
  });
});
