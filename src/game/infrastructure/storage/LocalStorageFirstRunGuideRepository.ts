import type { FirstRunGuideRepository } from '../../ports/FirstRunGuideRepository';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FIRST_RUN_GUIDE_STORAGE_KEY = 'toy-base-reversal.first-run-guide.v1';

export class LocalStorageFirstRunGuideRepository
  implements FirstRunGuideRepository
{
  public constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = FIRST_RUN_GUIDE_STORAGE_KEY,
  ) {}

  public isCompleted(): boolean {
    return this.storage.getItem(this.storageKey) === 'completed';
  }

  public markCompleted(): void {
    this.storage.setItem(this.storageKey, 'completed');
  }
}
