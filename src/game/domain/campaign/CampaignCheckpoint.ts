import {
  DefenseBlueprint,
  type DefenseBlueprintSnapshot,
} from '../battlefield/DefenseBlueprint';
import { SquadPlan, type SquadPlanSnapshot } from '../attack/SquadPlan';
import {
  RoundSession,
  type RoundSessionSnapshot,
} from '../rounds/RoundSession';

export type CampaignCheckpointPhase =
  | 'defense-preparation'
  | 'attack-preparation';

export interface CampaignDefenseSnapshot {
  readonly blueprint: DefenseBlueprintSnapshot;
  readonly constructionFunds: number;
}

export interface CampaignCheckpointSnapshot {
  readonly version: 1;
  readonly phase: CampaignCheckpointPhase;
  readonly roundSession: RoundSessionSnapshot;
  readonly defense: CampaignDefenseSnapshot;
  readonly squadPlan: SquadPlanSnapshot | null;
  readonly savedAt: string;
}

export class CampaignCheckpoint {
  private constructor(
    public readonly phase: CampaignCheckpointPhase,
    public readonly roundSession: RoundSession,
    public readonly defenseBlueprint: DefenseBlueprint,
    public readonly constructionFunds: number,
    public readonly squadPlan: SquadPlan | null,
    public readonly savedAt: string,
  ) {}

  public static create(
    phase: CampaignCheckpointPhase,
    roundSession: RoundSession,
    defenseBlueprint: DefenseBlueprint,
    constructionFunds: number,
    squadPlan: SquadPlan | null,
    savedAt: string,
  ): CampaignCheckpoint {
    if (
      roundSession.isChallengeMode ||
      roundSession.isNormalModeComplete ||
      roundSession.completedRounds.length !== roundSession.currentRound - 1
    ) {
      throw new Error('Only an active normal campaign can be saved.');
    }
    if (!Number.isInteger(constructionFunds) || constructionFunds < 0) {
      throw new Error('Saved construction funds must be a non-negative integer.');
    }
    if (Number.isNaN(Date.parse(savedAt))) {
      throw new Error('Campaign save time is invalid.');
    }

    const isAttackPreparation = phase === 'attack-preparation';
    if (
      isAttackPreparation !== roundSession.isDefenseComplete ||
      isAttackPreparation !== (squadPlan !== null)
    ) {
      throw new Error('Campaign phase does not match its round state.');
    }
    if (
      squadPlan !== null &&
      squadPlan.totalBudget !==
        roundSession.currentDefenseResult?.sortieReward.totalPoints
    ) {
      throw new Error('Saved squad budget does not match its defense reward.');
    }

    return new CampaignCheckpoint(
      phase,
      RoundSession.restore(roundSession.snapshot),
      DefenseBlueprint.restore(defenseBlueprint.snapshot),
      constructionFunds,
      squadPlan === null ? null : SquadPlan.restore(squadPlan.snapshot),
      savedAt,
    );
  }

  public static restore(snapshot: CampaignCheckpointSnapshot): CampaignCheckpoint {
    if (snapshot.version !== 1) {
      throw new Error('Campaign save version is unsupported.');
    }
    if (
      snapshot.phase !== 'defense-preparation' &&
      snapshot.phase !== 'attack-preparation'
    ) {
      throw new Error('Campaign save phase is invalid.');
    }

    return CampaignCheckpoint.create(
      snapshot.phase,
      RoundSession.restore(snapshot.roundSession),
      DefenseBlueprint.restore(snapshot.defense.blueprint),
      snapshot.defense.constructionFunds,
      snapshot.squadPlan === null
        ? null
        : SquadPlan.restore(snapshot.squadPlan),
      snapshot.savedAt,
    );
  }

  public get snapshot(): CampaignCheckpointSnapshot {
    return {
      version: 1,
      phase: this.phase,
      roundSession: this.roundSession.snapshot,
      defense: {
        blueprint: this.defenseBlueprint.snapshot,
        constructionFunds: this.constructionFunds,
      },
      squadPlan: this.squadPlan?.snapshot ?? null,
      savedAt: this.savedAt,
    };
  }
}
