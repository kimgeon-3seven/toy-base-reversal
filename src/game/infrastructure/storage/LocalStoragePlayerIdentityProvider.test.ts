import { describe, expect, it } from 'vitest';
import { LocalStoragePlayerIdentityProvider } from './LocalStoragePlayerIdentityProvider';

class MemoryIdentityStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('LocalStoragePlayerIdentityProvider', () => {
  it('creates and then reuses a stable anonymous player id', () => {
    const storage = new MemoryIdentityStorage();
    const first = new LocalStoragePlayerIdentityProvider(
      storage,
      () => 'player-one',
      'identity',
    );
    const second = new LocalStoragePlayerIdentityProvider(
      storage,
      () => 'player-two',
      'identity',
    );

    expect(first.getPlayerId()).toBe('player-one');
    expect(first.getPlayerId()).toBe('player-one');
    expect(second.getPlayerId()).toBe('player-one');
  });
});
