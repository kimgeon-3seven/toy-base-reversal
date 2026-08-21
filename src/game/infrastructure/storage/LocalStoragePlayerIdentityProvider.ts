import type { PlayerIdentityProvider } from '../../ports/PlayerIdentityProvider';

interface IdentityStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type PlayerIdFactory = () => string;

const PLAYER_ID_STORAGE_KEY = 'toy-base-reversal.player-id.v1';

export class LocalStoragePlayerIdentityProvider
  implements PlayerIdentityProvider
{
  private cachedPlayerId: string | null = null;

  public constructor(
    private readonly storage: IdentityStorage,
    private readonly createPlayerId: PlayerIdFactory,
    private readonly storageKey = PLAYER_ID_STORAGE_KEY,
  ) {}

  public getPlayerId(): string {
    if (this.cachedPlayerId !== null) return this.cachedPlayerId;

    try {
      const saved = this.storage.getItem(this.storageKey);
      if (saved !== null && saved.trim().length > 0) {
        this.cachedPlayerId = saved;
        return saved;
      }
    } catch {
      // Fall through to a session-only identity.
    }

    const created = this.createPlayerId();
    this.cachedPlayerId = created;
    try {
      this.storage.setItem(this.storageKey, created);
    } catch {
      // Keep the generated identity for this browser session.
    }
    return created;
  }
}
