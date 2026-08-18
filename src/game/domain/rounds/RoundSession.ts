export interface DefenseRoundResult {
  readonly defeatedEnemies: number;
  readonly remainingCoreHealth: number;
}

export interface RoundResult {
  readonly roundNumber: number;
  readonly defense: DefenseRoundResult;
  readonly attackTimeMs: number;
}

export type GameMode = 'normal' | 'challenge';

export class RoundSession {
  private currentRoundNumber = 1;
  private pendingDefenseResult: DefenseRoundResult | null = null;
  private readonly completedRoundResults: RoundResult[] = [];

  public constructor(public readonly normalRoundCount = 5) {
    if (!Number.isInteger(normalRoundCount) || normalRoundCount <= 0) {
      throw new Error('Normal round count must be a positive integer.');
    }
  }

  public get currentRound(): number {
    return this.currentRoundNumber;
  }

  public get mode(): GameMode {
    return this.isChallengeMode ? 'challenge' : 'normal';
  }

  public get isChallengeMode(): boolean {
    return this.currentRoundNumber > this.normalRoundCount;
  }

  public get challengeRound(): number {
    return this.isChallengeMode
      ? this.currentRoundNumber - this.normalRoundCount
      : 0;
  }

  public get completedRounds(): readonly RoundResult[] {
    return [...this.completedRoundResults];
  }

  public get latestResult(): RoundResult | null {
    return this.completedRoundResults.at(-1) ?? null;
  }

  public get isDefenseComplete(): boolean {
    return this.pendingDefenseResult !== null;
  }

  public get isNormalModeComplete(): boolean {
    return this.completedRoundResults.length >= this.normalRoundCount;
  }

  public get completedChallengeRounds(): readonly RoundResult[] {
    return this.completedRoundResults.filter(
      (result) => result.roundNumber > this.normalRoundCount,
    );
  }

  public get highestCompletedChallengeRound(): number {
    const latestChallengeResult = this.completedChallengeRounds.at(-1);
    return latestChallengeResult === undefined
      ? 0
      : latestChallengeResult.roundNumber - this.normalRoundCount;
  }

  public get latestChallengeAttackTimeMs(): number | null {
    return this.completedChallengeRounds.at(-1)?.attackTimeMs ?? null;
  }

  public get totalAttackTimeMs(): number {
    return this.completedRoundResults.reduce(
      (total, result) => total + result.attackTimeMs,
      0,
    );
  }

  public recordDefenseVictory(result: DefenseRoundResult): void {
    if (this.isNormalModeComplete && !this.isChallengeMode) {
      throw new Error('Challenge mode must begin before recording more rounds.');
    }
    if (result.defeatedEnemies < 0 || result.remainingCoreHealth <= 0) {
      throw new Error('A defense victory requires valid surviving-core results.');
    }
    if (this.pendingDefenseResult !== null) {
      throw new Error('Defense victory is already recorded for this round.');
    }
    this.pendingDefenseResult = { ...result };
  }

  public recordAttackVictory(attackTimeMs: number): RoundResult {
    if (this.pendingDefenseResult === null) {
      throw new Error('Defense must be completed before recording an attack.');
    }
    if (!Number.isFinite(attackTimeMs) || attackTimeMs <= 0) {
      throw new Error('Attack clear time must be positive.');
    }

    const result: RoundResult = {
      roundNumber: this.currentRoundNumber,
      defense: this.pendingDefenseResult,
      attackTimeMs,
    };
    this.completedRoundResults.push(result);
    this.pendingDefenseResult = null;
    return result;
  }

  public advanceToNextRound(): boolean {
    if (this.latestResult?.roundNumber !== this.currentRoundNumber) {
      throw new Error('The current round must be completed before advancing.');
    }
    if (this.isNormalModeComplete && !this.isChallengeMode) {
      return false;
    }
    this.currentRoundNumber += 1;
    return true;
  }

  public enterChallengeMode(): boolean {
    if (!this.isNormalModeComplete) {
      throw new Error('Normal mode must be completed before challenge mode.');
    }
    if (this.isChallengeMode) return false;
    if (this.latestResult?.roundNumber !== this.currentRoundNumber) {
      throw new Error('The final normal round must be completed first.');
    }

    this.currentRoundNumber += 1;
    return true;
  }
}
