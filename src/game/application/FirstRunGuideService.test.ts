import { describe, expect, it } from 'vitest';
import type { FirstRunGuideRepository } from '../ports/FirstRunGuideRepository';
import { FirstRunGuideService } from './FirstRunGuideService';

class GuideRepositoryStub implements FirstRunGuideRepository {
  public completed = false;
  public shouldThrow = false;

  public isCompleted(): boolean {
    if (this.shouldThrow) throw new Error('storage blocked');
    return this.completed;
  }

  public markCompleted(): void {
    if (this.shouldThrow) throw new Error('storage blocked');
    this.completed = true;
  }
}

describe('FirstRunGuideService', () => {
  it('creates a detailed guide until completion is saved', () => {
    const repository = new GuideRepositoryStub();
    const service = new FirstRunGuideService(repository);

    expect(service.createGuide().isDetailed).toBe(true);
    service.markCompleted();
    expect(service.createGuide().isDetailed).toBe(false);
  });

  it('falls back to a detailed guide when storage is unavailable', () => {
    const repository = new GuideRepositoryStub();
    repository.shouldThrow = true;
    const service = new FirstRunGuideService(repository);

    expect(service.createGuide().isDetailed).toBe(true);
    expect(() => service.markCompleted()).not.toThrow();
  });
});
