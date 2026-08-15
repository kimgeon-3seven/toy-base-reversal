export interface DefenseRoundResult {
  readonly defeatedEnemies: number;
  readonly remainingCoreHealth: number;
}

export interface RoundResult {
  readonly roundNumber: number;
  readonly defense: DefenseRoundResult;
  readonly attackTimeMs: number;
}

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
    return this.completedRoundResults.length === this.normalRoundCount;
  }

  public get totalAttackTimeMs(): number {
    return this.completedRoundResults.reduce(
      (total, result) => total + result.attackTimeMs,
      0,
    );
  }

  public recordDefenseVictory(result: DefenseRoundResult): void {
    if (this.isNormalModeComplete) {
      throw new Error('Normal mode is already complete.');
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
    if (this.isNormalModeComplete) {
      return false;
    }
    this.currentRoundNumber += 1;
    return true;
  }
}
