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

export class StagedCappedSortiePointPolicy implements SortiePointPolicy {
  public constructor(
    private readonly startingPoints: number,
    private readonly normalPointsPerRound: number,
    private readonly normalRoundCount: number,
    private readonly challengePointsPerRound: number,
    private readonly maximumPoints: number,
  ) {
    const values = [
      startingPoints,
      normalPointsPerRound,
      normalRoundCount,
      challengePointsPerRound,
      maximumPoints,
    ];
    if (
      values.some((value) => !Number.isInteger(value)) ||
      startingPoints <= 0 ||
      normalPointsPerRound < 0 ||
      normalRoundCount <= 0 ||
      challengePointsPerRound < 0 ||
      maximumPoints < this.normalModeFinalPoints
    ) {
      throw new Error('Staged sortie point values must be valid integers.');
    }
  }

  public pointsForRound(roundNumber: number): number {
    if (!Number.isInteger(roundNumber) || roundNumber <= 0) {
      throw new Error('Round number must be a positive integer.');
    }
    if (roundNumber <= this.normalRoundCount) {
      return this.startingPoints +
        (roundNumber - 1) * this.normalPointsPerRound;
    }

    const challengeRound = roundNumber - this.normalRoundCount;
    return Math.min(
      this.maximumPoints,
      this.normalModeFinalPoints +
        challengeRound * this.challengePointsPerRound,
    );
  }

  private get normalModeFinalPoints(): number {
    return this.startingPoints +
      (this.normalRoundCount - 1) * this.normalPointsPerRound;
  }
}
