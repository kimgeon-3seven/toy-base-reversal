import type { DefenseEditor } from './DefenseEditor';
import { CampaignCheckpoint } from '../domain/campaign/CampaignCheckpoint';
import { RoundSession } from '../domain/rounds/RoundSession';
import type { SquadPlan } from '../domain/attack/SquadPlan';
import type { CampaignCheckpointRepository } from '../ports/CampaignCheckpointRepository';

export interface CampaignClock {
  now(): string;
}

const SYSTEM_CAMPAIGN_CLOCK: CampaignClock = {
  now: () => new Date().toISOString(),
};

export class CampaignSaveService {
  public constructor(
    private readonly repository: CampaignCheckpointRepository,
    private readonly clock: CampaignClock = SYSTEM_CAMPAIGN_CLOCK,
  ) {}

  public load(): CampaignCheckpoint | null {
    const snapshot = this.repository.load();
    if (snapshot === null) return null;
    try {
      return CampaignCheckpoint.restore(snapshot);
    } catch {
      this.repository.clear();
      return null;
    }
  }

  public saveDefensePreparation(
    roundSession: RoundSession,
    editor: DefenseEditor,
  ): CampaignCheckpoint {
    const state = editor.captureCampaignState();
    return this.persist(
      CampaignCheckpoint.create(
        'defense-preparation',
        roundSession,
        state.blueprint,
        state.constructionFunds,
        null,
        this.clock.now(),
      ),
    );
  }

  public saveAttackPreparation(
    roundSession: RoundSession,
    editor: DefenseEditor,
    squadPlan: SquadPlan,
  ): CampaignCheckpoint {
    const state = editor.captureSavedCampaignState();
    return this.persist(
      CampaignCheckpoint.create(
        'attack-preparation',
        roundSession,
        state.blueprint,
        state.constructionFunds,
        squadPlan,
        this.clock.now(),
      ),
    );
  }

  public saveNextRoundPreparation(
    completedSession: RoundSession,
    editor: DefenseEditor,
    constructionReward: number,
  ): CampaignCheckpoint | null {
    if (completedSession.isNormalModeComplete) {
      this.clear();
      return null;
    }
    if (!Number.isInteger(constructionReward) || constructionReward < 0) {
      throw new Error('Construction reward must be a non-negative integer.');
    }

    const nextRoundSession = RoundSession.restore(completedSession.snapshot);
    if (!nextRoundSession.advanceToNextRound()) {
      throw new Error('Completed campaign cannot create a next-round save.');
    }
    const state = editor.captureSavedCampaignState();
    return this.persist(
      CampaignCheckpoint.create(
        'defense-preparation',
        nextRoundSession,
        state.blueprint,
        state.constructionFunds + constructionReward,
        null,
        this.clock.now(),
      ),
    );
  }

  public clear(): void {
    this.repository.clear();
  }

  private persist(checkpoint: CampaignCheckpoint): CampaignCheckpoint {
    this.repository.save(checkpoint.snapshot);
    return checkpoint;
  }
}
