export type FirstRunGuideStage =
  | 'opening'
  | 'defense-preparation'
  | 'defense-combat'
  | 'role-reversal'
  | 'attack-preparation'
  | 'attack-movement'
  | 'attack-focus'
  | 'attack-disrupt'
  | 'complete';

export class FirstRunGuide {
  private currentStage: FirstRunGuideStage = 'opening';

  public constructor(private detailedPrompts: boolean) {}

  public get stage(): FirstRunGuideStage {
    return this.currentStage;
  }

  public get isDetailed(): boolean {
    return this.detailedPrompts;
  }

  public beginDefensePreparation(): void {
    this.currentStage = 'defense-preparation';
  }

  public beginDefenseCombat(): void {
    this.currentStage = 'defense-combat';
  }

  public beginRoleReversal(): void {
    this.currentStage = 'role-reversal';
  }

  public beginAttackPreparation(): void {
    this.currentStage = 'attack-preparation';
  }

  public beginAttackCombat(): void {
    this.currentStage = this.detailedPrompts ? 'attack-movement' : 'complete';
  }

  public recordCommanderMovement(): void {
    if (this.currentStage === 'attack-movement') {
      this.currentStage = 'attack-focus';
    }
  }

  public recordFocusFire(): void {
    if (
      this.currentStage === 'attack-movement' ||
      this.currentStage === 'attack-focus'
    ) {
      this.currentStage = 'attack-disrupt';
    }
  }

  public recordDisruption(): void {
    if (
      this.currentStage === 'attack-movement' ||
      this.currentStage === 'attack-focus' ||
      this.currentStage === 'attack-disrupt'
    ) {
      this.currentStage = 'complete';
    }
  }

  public complete(): void {
    this.currentStage = 'complete';
  }

  public restartDetailed(): void {
    this.detailedPrompts = true;
    this.currentStage = 'opening';
  }
}
