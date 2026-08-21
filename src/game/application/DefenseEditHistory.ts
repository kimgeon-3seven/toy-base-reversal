import type { DefenseBlueprint } from '../domain/battlefield/DefenseBlueprint';

export interface DefenseEditSnapshot {
  readonly blueprint: DefenseBlueprint;
  readonly constructionFunds: number;
}

export class DefenseEditHistory {
  private readonly undoSnapshots: DefenseEditSnapshot[] = [];
  private readonly redoSnapshots: DefenseEditSnapshot[] = [];

  public constructor(private readonly maximumEntries = 50) {
    if (!Number.isInteger(maximumEntries) || maximumEntries <= 0) {
      throw new Error('Edit history size must be a positive integer.');
    }
  }

  public get canUndo(): boolean {
    return this.undoSnapshots.length > 0;
  }

  public get canRedo(): boolean {
    return this.redoSnapshots.length > 0;
  }

  public record(snapshot: DefenseEditSnapshot): void {
    this.undoSnapshots.push(snapshot);
    if (this.undoSnapshots.length > this.maximumEntries) {
      this.undoSnapshots.shift();
    }
    this.redoSnapshots.splice(0);
  }

  public undo(current: DefenseEditSnapshot): DefenseEditSnapshot | null {
    const previous = this.undoSnapshots.pop();
    if (previous === undefined) return null;
    this.redoSnapshots.push(current);
    return previous;
  }

  public redo(current: DefenseEditSnapshot): DefenseEditSnapshot | null {
    const next = this.redoSnapshots.pop();
    if (next === undefined) return null;
    this.undoSnapshots.push(current);
    return next;
  }

  public clear(): void {
    this.undoSnapshots.splice(0);
    this.redoSnapshots.splice(0);
  }
}
