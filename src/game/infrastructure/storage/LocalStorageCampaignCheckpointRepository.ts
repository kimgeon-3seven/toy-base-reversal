import type { CampaignCheckpointSnapshot } from '../../domain/campaign/CampaignCheckpoint';
import type { CampaignCheckpointRepository } from '../../ports/CampaignCheckpointRepository';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const CAMPAIGN_CHECKPOINT_STORAGE_KEY =
  'toy-base-reversal.campaign-checkpoint.v1';

export class LocalStorageCampaignCheckpointRepository
  implements CampaignCheckpointRepository
{
  public constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = CAMPAIGN_CHECKPOINT_STORAGE_KEY,
  ) {}

  public load(): CampaignCheckpointSnapshot | null {
    const serialized = this.storage.getItem(this.storageKey);
    if (serialized === null) return null;
    try {
      return JSON.parse(serialized) as CampaignCheckpointSnapshot;
    } catch {
      this.clear();
      return null;
    }
  }

  public save(checkpoint: CampaignCheckpointSnapshot): void {
    this.storage.setItem(this.storageKey, JSON.stringify(checkpoint));
  }

  public clear(): void {
    this.storage.removeItem(this.storageKey);
  }
}
