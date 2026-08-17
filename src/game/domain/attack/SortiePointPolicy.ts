export interface SortiePointPolicy {
  pointsForRound(roundNumber: number): number;
}

export class LinearSortiePointPolicy implements SortiePointPolicy {
  public constructor(
    private readonly startingPoints: number,
    private readonly pointsPerAdditionalRound: number,
  ) {
    if (
      !Number.isInteger(startingPoints) ||
      startingPoints <= 0 ||
      !Number.isInteger(pointsPerAdditionalRound) ||
      pointsPerAdditionalRound < 0
    ) {
      throw new Error('Sortie point values must be valid integers.');
    }
  }

  public pointsForRound(roundNumber: number): number {
    if (!Number.isInteger(roundNumber) || roundNumber <= 0) {
      throw new Error('Round number must be a positive integer.');
    }
    return this.startingPoints +
      (roundNumber - 1) * this.pointsPerAdditionalRound;
  }
}
