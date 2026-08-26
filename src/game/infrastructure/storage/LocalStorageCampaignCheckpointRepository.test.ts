import { describe, expect, it } from 'vitest';
import type { CampaignCheckpointSnapshot } from '../../domain/campaign/CampaignCheckpoint';
import { LocalStorageCampaignCheckpointRepository } from './LocalStorageCampaignCheckpointRepository';

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

describe('LocalStorageCampaignCheckpointRepository', () => {
  it('serializes, loads, and clears a campaign checkpoint', () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageCampaignCheckpointRepository(
      storage,
      'test-campaign',
    );
    const snapshot = {
      version: 1,
      phase: 'defense-preparation',
      roundSession: {
        normalRoundCount: 5,
        currentRound: 1,
        pendingDefenseResult: null,
        completedRounds: [],
      },
      defense: {
        blueprint: { structures: [] },
        constructionFunds: 15,
      },
      squadPlan: null,
      savedAt: '2026-08-26T10:00:00.000Z',
    } satisfies CampaignCheckpointSnapshot;

    repository.save(snapshot);
    expect(repository.load()).toEqual(snapshot);
    repository.clear();
    expect(repository.load()).toBeNull();
  });

  it('removes malformed JSON instead of throwing repeatedly', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-campaign', '{broken');
    const repository = new LocalStorageCampaignCheckpointRepository(
      storage,
      'test-campaign',
    );

    expect(repository.load()).toBeNull();
    expect(storage.getItem('test-campaign')).toBeNull();
  });
});
