import type { CampaignCheckpointSnapshot } from '../domain/campaign/CampaignCheckpoint';

export interface CampaignCheckpointRepository {
  load(): CampaignCheckpointSnapshot | null;
  save(checkpoint: CampaignCheckpointSnapshot): void;
  clear(): void;
}
