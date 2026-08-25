import { describe, expect, it } from 'vitest';
import { DefenseEditor } from '../application/DefenseEditor';
import { AttackCombat } from '../domain/attack/AttackCombat';
import type { SquadPlan } from '../domain/attack/SquadPlan';
import { Battlefield } from '../domain/battlefield/Battlefield';
import { DefenseCombat } from '../domain/combat/DefenseCombat';
import { unitCost } from '../domain/combat/UnitEconomy';
import { GridPosition } from '../domain/grid/GridPosition';
import { BreadthFirstPathfinder } from '../domain/pathfinding/BreadthFirstPathfinder';
import {
  createPrototypeAttackCombatConfig,
  NORMAL_MODE_ATTACK_TIME_TARGETS_MS,
} from './AttackCombatConfig';
import { createPrototypeSquadPlan } from './AttackSquadConfig';
import { createBattlefieldMap } from './BattlefieldConfig';
import {
  createPrototypeConstructionEconomy,
  ROUND_CONSTRUCTION_REWARD,
} from './ConstructionEconomyConfig';
import { availableUnitArchetypes } from './ContentConfig';
import {
  createPrototypeDefenseCombatConfig,
  createPrototypeDefenseWave,
} from './DefenseCombatConfig';
import { defenseSortieRewardForRound } from './DefenseRewardConfig';
import { INITIAL_DEFENSE_PLACEMENTS } from './InitialDefenseConfig';
import { createPrototypeTowerUpgradePolicy } from './TowerUpgradeConfig';

interface RoundBalanceResult {
  readonly round: number;
  readonly defenseWon: boolean;
  readonly remainingCoreHealth: number;
  readonly leakCount: number;
  readonly awardedSortiePoints: number;
  readonly attackWon: boolean;
  readonly attackFailureReason: AttackCombat['failureReason'];
  readonly attackTimeMs: number;
}

function createScenarioEditor(): DefenseEditor {
  const editor = createEmptyEditor();
  for (const placement of INITIAL_DEFENSE_PLACEMENTS) {
    const position = new GridPosition(placement.column, placement.row);
    const result =
      placement.kind === 'tower'
        ? editor.placeTower(placement.towerArchetype, position)
        : editor.place('obstacle', position);
    if (!result.success) throw new Error(`Scenario seed failed: ${result.reason}`);
  }
  editor.saveBlueprint();
  return editor;
}

function createEmptyEditor(): DefenseEditor {
  return new DefenseEditor(
    new Battlefield(createBattlefieldMap(), new BreadthFirstPathfinder()),
    createPrototypeConstructionEconomy(),
    createPrototypeTowerUpgradePolicy(),
  );
}

function simulateDefense(editor: DefenseEditor, round: number): DefenseCombat {
  const defense = new DefenseCombat(
    editor.battlefield,
    createPrototypeDefenseWave(round),
    createPrototypeDefenseCombatConfig(),
  );
  defense.update(120_000);
  return defense;
}

function fillBaselineSquad(plan: SquadPlan, roundNumber: number): void {
  const available = [...availableUnitArchetypes(roundNumber)].sort(
    (left, right) => unitCost(left) - unitCost(right),
  );
  let lane = 0;
  let addedInPass = true;
  while (addedInPass) {
    addedInPass = false;
    for (const unit of available) {
      if (plan.addUnit(lane % plan.lanes.length, unit)) {
        addedInPass = true;
        lane += 1;
      }
    }
  }
}

function prepareNextRoundDefense(editor: DefenseEditor, nextRound: number): void {
  editor.grantConstructionFunds(ROUND_CONSTRUCTION_REWARD);
  if (nextRound === 2) {
    const result = editor.placeTower('mortar', new GridPosition(10, 4));
    if (!result.success) throw new Error(`Round 2 setup failed: ${result.reason}`);
  } else if (nextRound === 3) {
    const result = editor.placeTower('piercer', new GridPosition(14, 8));
    if (!result.success) throw new Error(`Round 3 setup failed: ${result.reason}`);
  } else if (nextRound === 4) {
    const popguns = editor.battlefield.structures.filter(
      (structure) => structure.towerArchetype === 'popgun',
    );
    for (const popgun of popguns.slice(0, 2)) {
      const result = editor.upgradeTower(popgun.id);
      if (!result.success) throw new Error(`Round 4 setup failed: ${result.reason}`);
    }
  } else if (nextRound === 5) {
    const mortar = editor.battlefield.structures.find(
      (structure) => structure.towerArchetype === 'mortar',
    );
    if (mortar === undefined) throw new Error('Round 5 setup requires a mortar.');
    const result = editor.upgradeTower(mortar.id);
    if (!result.success) throw new Error(`Round 5 setup failed: ${result.reason}`);
  }
  editor.saveBlueprint();
}

function runNormalModeBaseline(): readonly RoundBalanceResult[] {
  const editor = createScenarioEditor();
  const results: RoundBalanceResult[] = [];
  for (let round = 1; round <= 5; round += 1) {
    const defense = new DefenseCombat(
      editor.battlefield,
      createPrototypeDefenseWave(round),
      createPrototypeDefenseCombatConfig(),
    );
    defense.update(120_000);
    const defenseWon = defense.state === 'won';
    const remainingCoreHealth = defense.coreHealth;
    const leakCount = defense.leakCount;
    const sortieReward = defenseSortieRewardForRound(round, {
      defeatedEnemies: defense.killCount,
      breachedEnemies: defense.leakCount,
      remainingCoreHealth: defense.coreHealth,
      coreMaxHealth: defense.config.coreMaxHealth,
    });

    editor.restoreBlueprint();
    const plan = createPrototypeSquadPlan(
      round,
      false,
      sortieReward.totalPoints,
    );
    fillBaselineSquad(plan, round);
    const attack = new AttackCombat(
      editor.battlefield,
      plan,
      createPrototypeAttackCombatConfig(round),
    );
    attack.update(90_000);
    results.push({
      round,
      defenseWon,
      remainingCoreHealth,
      leakCount,
      awardedSortiePoints: sortieReward.totalPoints,
      attackWon: attack.state === 'won',
      attackFailureReason: attack.failureReason,
      attackTimeMs: attack.elapsedTimeMs,
    });

    editor.restoreBlueprint();
    if (round < 5) prepareNextRoundDefense(editor, round + 1);
  }
  return results;
}

describe('normal mode balance baseline', () => {
  it('lets the prepared first defense survive the shortened tutorial wave', () => {
    const firstRound = simulateDefense(createScenarioEditor(), 1);

    expect(firstRound.state).toBe('won');
    expect(firstRound.coreHealth).toBeGreaterThanOrEqual(90);
    expect(firstRound.coreHealth).toBeLessThanOrEqual(120);
  });

  it('keeps the standard progression viable through all five rounds', () => {
    const results = runNormalModeBaseline();

    for (const [index, result] of results.entries()) {
      const target = NORMAL_MODE_ATTACK_TIME_TARGETS_MS[index];
      expect(result.defenseWon).toBe(true);
      expect(result.attackWon).toBe(true);
      expect(result.attackFailureReason).toBeNull();
      expect(result.awardedSortiePoints).toBeGreaterThan(0);
      const rewardedMinimum = Math.max(
        20_000,
        Math.floor((target?.minimum ?? 0) * 0.65),
      );
      expect(result.attackTimeMs).toBeGreaterThanOrEqual(rewardedMinimum);
      expect(result.attackTimeMs).toBeLessThanOrEqual(
        target?.maximum ?? Number.POSITIVE_INFINITY,
      );
    }
  });

  it('punishes skipping defense construction entirely', () => {
    const defense = simulateDefense(createEmptyEditor(), 1);

    expect(defense.state).toBe('lost');
    expect(defense.coreHealth).toBe(0);
  });

  it('rewards a mixed round-three defense over one-type tower spam', () => {
    const spamEditor = createEmptyEditor();
    for (const position of [
      new GridPosition(5, 4),
      new GridPosition(8, 8),
      new GridPosition(11, 4),
      new GridPosition(14, 8),
      new GridPosition(16, 4),
    ]) {
      const result = spamEditor.placeTower('popgun', position);
      if (!result.success) throw new Error(`Spam setup failed: ${result.reason}`);
    }

    const mixedEditor = createScenarioEditor();
    prepareNextRoundDefense(mixedEditor, 2);
    prepareNextRoundDefense(mixedEditor, 3);
    const spam = simulateDefense(spamEditor, 3);
    const mixed = simulateDefense(mixedEditor, 3);

    expect(mixed.killCount).toBeGreaterThan(spam.killCount);
    expect(mixed.coreHealth).toBeGreaterThanOrEqual(spam.coreHealth);
  });
});
