import { describe, expect, it } from 'vitest';
import { Battlefield } from '../domain/battlefield/Battlefield';
import type { CampaignCheckpointSnapshot } from '../domain/campaign/CampaignCheckpoint';
import {
  ConstructionEconomy,
  FixedConstructionCostPolicy,
} from '../domain/economy/ConstructionEconomy';
import { GridMap } from '../domain/grid/GridMap';
import { GridPosition } from '../domain/grid/GridPosition';
import { BreadthFirstPathfinder } from '../domain/pathfinding/BreadthFirstPathfinder';
import { RoundSession } from '../domain/rounds/RoundSession';
import { SquadPlan } from '../domain/attack/SquadPlan';
import { FixedTowerUpgradePolicy } from '../domain/structures/TowerUpgradePolicy';
import type { CampaignCheckpointRepository } from '../ports/CampaignCheckpointRepository';
import { CampaignSaveService } from './CampaignSaveService';
import { DefenseEditor } from './DefenseEditor';

class MemoryCampaignRepository implements CampaignCheckpointRepository {
  public value: CampaignCheckpointSnapshot | null = null;

  public load(): CampaignCheckpointSnapshot | null {
    return this.value;
  }

  public save(checkpoint: CampaignCheckpointSnapshot): void {
    this.value = checkpoint;
  }

  public clear(): void {
    this.value = null;
  }
}

function createEditor(): DefenseEditor {
  return new DefenseEditor(
    new Battlefield(
      new GridMap(
        5,
        3,
        [new GridPosition(0, 1)],
        new GridPosition(4, 1),
      ),
      new BreadthFirstPathfinder(),
    ),
    new ConstructionEconomy(
      15,
      new FixedConstructionCostPolicy({
        towers: { popgun: 3, mortar: 5, piercer: 6 },
        obstacle: 2,
      }),
    ),
    new FixedTowerUpgradePolicy({
      maxLevel: 2,
      costs: { popgun: 2, mortar: 3, piercer: 4 },
      damageMultiplierPerLevel: 1.3,
      maxHealthMultiplierPerLevel: 1.2,
    }),
  );
}

const defenseResult = {
  defeatedEnemies: 8,
  breachedEnemies: 2,
  remainingCoreHealth: 80,
  coreMaxHealth: 100,
  sortieReward: {
    basePoints: 18,
    killBonus: 4,
    coreHealthBonus: 2,
    totalPoints: 24,
    killRate: 0.8,
    coreHealthRate: 0.8,
  },
};

describe('CampaignSaveService', () => {
  it('saves and restores design, funds, round, and accumulated attack time', () => {
    const repository = new MemoryCampaignRepository();
    const service = new CampaignSaveService(repository, {
      now: () => '2026-08-26T10:00:00.000Z',
    });
    const editor = createEditor();
    editor.placeTower('popgun', new GridPosition(1, 0));
    editor.saveBlueprint();
    const session = new RoundSession(5);
    session.recordDefenseVictory(defenseResult);
    session.recordAttackVictory(28_000);

    service.saveNextRoundPreparation(session, editor, 4);
    const restored = service.load();

    expect(restored?.phase).toBe('defense-preparation');
    expect(restored?.roundSession.currentRound).toBe(2);
    expect(restored?.roundSession.totalAttackTimeMs).toBe(28_000);
    expect(restored?.constructionFunds).toBe(16);
    expect(restored?.defenseBlueprint.snapshot.structures).toHaveLength(1);
  });

  it('keeps the attack formation with its defense reward checkpoint', () => {
    const repository = new MemoryCampaignRepository();
    const service = new CampaignSaveService(repository);
    const editor = createEditor();
    editor.placeTower('popgun', new GridPosition(1, 0));
    editor.saveBlueprint();
    const session = new RoundSession(5);
    session.recordDefenseVictory(defenseResult);
    const squad = new SquadPlan(24, 2, 3);
    squad.addUnit(0, 'tank');
    squad.addUnit(2, 'ranger');

    service.saveAttackPreparation(session, editor, squad);

    expect(service.load()?.squadPlan?.lanes).toEqual([
      ['tank'],
      [],
      ['ranger'],
    ]);
  });

  it('clears a corrupted or completed campaign instead of crashing', () => {
    const repository = new MemoryCampaignRepository();
    const service = new CampaignSaveService(repository);
    repository.value = { version: 99 } as unknown as CampaignCheckpointSnapshot;

    expect(service.load()).toBeNull();
    expect(repository.value).toBeNull();

    const editor = createEditor();
    editor.saveBlueprint();
    const completed = new RoundSession(1);
    completed.recordDefenseVictory(defenseResult);
    completed.recordAttackVictory(20_000);
    expect(service.saveNextRoundPreparation(completed, editor, 4)).toBeNull();
    expect(repository.value).toBeNull();
  });
});
