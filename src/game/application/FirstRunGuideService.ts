import { FirstRunGuide } from './FirstRunGuide';
import type { FirstRunGuideRepository } from '../ports/FirstRunGuideRepository';

export class FirstRunGuideService {
  public constructor(private readonly repository: FirstRunGuideRepository) {}

  public createGuide(): FirstRunGuide {
    try {
      return new FirstRunGuide(!this.repository.isCompleted());
    } catch {
      return new FirstRunGuide(true);
    }
  }

  public markCompleted(): void {
    try {
      this.repository.markCompleted();
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
  }
}
