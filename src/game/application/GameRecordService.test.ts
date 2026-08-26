import { describe, expect, it } from 'vitest';
import type { PlayerRecordSnapshot } from '../domain/records/PlayerRecord';
import type { PlayerRecordRepository } from '../ports/PlayerRecordRepository';
import { GameRecordService } from './GameRecordService';

class InMemoryPlayerRecordRepository implements PlayerRecordRepository {
  public saved: PlayerRecordSnapshot | null = null;
  public saveCount = 0;

  public load(): PlayerRecordSnapshot | null {
    return this.saved;
  }

  public save(record: PlayerRecordSnapshot): void {
    this.saved = record;
    this.saveCount += 1;
  }

  public clear(): void {
    this.saved = null;
  }
}

describe('GameRecordService', () => {
  it('persists only higher normal-mode progress', () => {
    const repository = new InMemoryPlayerRecordRepository();
    const service = new GameRecordService(repository);

    expect(service.recordNormalRoundCompletion(2).isNewBest).toBe(true);
    expect(service.recordNormalRoundCompletion(1).isNewBest).toBe(false);
    expect(service.recordNormalRoundCompletion(2).isNewBest).toBe(false);
    expect(service.recordNormalRoundCompletion(4).isNewBest).toBe(true);
    expect(repository.saveCount).toBe(2);
    expect(repository.saved?.normalProgress?.highestCompletedRound).toBe(4);
  });

  it('persists only a new best result', () => {
    const repository = new InMemoryPlayerRecordRepository();
    const service = new GameRecordService(
      repository,
      () => new Date('2026-08-19T06:00:00.000Z'),
    );

    expect(service.recordChallengeCompletion(1, 40_000).isNewBest).toBe(true);
    expect(service.recordChallengeCompletion(1, 45_000).isNewBest).toBe(false);
    expect(repository.saveCount).toBe(1);
    expect(repository.saved?.challengeBest?.round).toBe(1);
  });

  it('restores saved records and can clear them', () => {
    const repository = new InMemoryPlayerRecordRepository();
    const first = new GameRecordService(repository);
    first.recordNormalCompletion(120_000);

    const restored = new GameRecordService(repository);
    expect(restored.record.normalBest?.totalAttackTimeMs).toBe(120_000);

    restored.reset();
    expect(restored.record.normalBest).toBeNull();
    expect(restored.record.highestCompletedNormalRound).toBe(0);
    expect(repository.saved).toBeNull();
  });

  it('recovers from an invalid persisted record', () => {
    const repository = new InMemoryPlayerRecordRepository();
    repository.saved = {
      version: 1,
      playerName: '',
      normalBest: null,
      challengeBest: null,
    };

    const service = new GameRecordService(repository);

    expect(service.record.playerName).toBe('로컬 플레이어');
    expect(repository.saved).toBeNull();
  });

  it('persists a renamed player without losing records', () => {
    const repository = new InMemoryPlayerRecordRepository();
    const service = new GameRecordService(repository);
    service.recordNormalCompletion(120_000);

    const renamed = service.renamePlayer('장난감 대장');

    expect(renamed.playerName).toBe('장난감 대장');
    expect(renamed.normalBest?.totalAttackTimeMs).toBe(120_000);
    expect(repository.saved?.playerName).toBe('장난감 대장');
  });
});
