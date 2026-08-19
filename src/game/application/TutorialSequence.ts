export interface TutorialStep {
  readonly title: string;
  readonly body: string;
  readonly objective: string;
}

export class TutorialSequence {
  private stepIndex = 0;

  public constructor(private readonly steps: readonly TutorialStep[]) {
    if (steps.length === 0) {
      throw new Error('Tutorial sequence requires at least one step.');
    }
  }

  public get currentStep(): TutorialStep | null {
    return this.steps[this.stepIndex] ?? null;
  }

  public get currentStepNumber(): number {
    return Math.min(this.stepIndex + 1, this.steps.length);
  }

  public get stepCount(): number {
    return this.steps.length;
  }

  public get isComplete(): boolean {
    return this.stepIndex >= this.steps.length;
  }

  public advance(): boolean {
    if (!this.isComplete) {
      this.stepIndex += 1;
    }
    return this.isComplete;
  }

  public skip(): void {
    this.stepIndex = this.steps.length;
  }
}
