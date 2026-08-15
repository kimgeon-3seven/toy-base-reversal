import { describe, expect, it } from 'vitest';
import {
  createPrototypeAttackCombatConfig,
  createPrototypeSquadPlan,
} from './AttackCombatConfig';
import { createPrototypeDefenseWave } from './DefenseCombatConfig';

describe('prototype round progression', () => {
  it('increases defense wave pressure across normal rounds', () => {
    const firstRound = createPrototypeDefenseWave(1);
    const fifthRound = createPrototypeDefenseWave(5);

    expect(fifthRound.spawns.length).toBeGreaterThan(firstRound.spawns.length);
    expect(fifthRound.spawns[0]?.stats.maxHealth).toBeGreaterThan(
      firstRound.spawns[0]?.stats.maxHealth ?? 0,
    );
  });

  it('raises both attack resources and target durability', () => {
    const firstPlan = createPrototypeSquadPlan(1);
    const fifthPlan = createPrototypeSquadPlan(5);
    const firstCombat = createPrototypeAttackCombatConfig(1);
    const fifthCombat = createPrototypeAttackCombatConfig(5);

    expect(fifthPlan.totalBudget).toBeGreaterThan(firstPlan.totalBudget);
    expect(fifthCombat.coreMaxHealth).toBeGreaterThan(firstCombat.coreMaxHealth);
    expect(fifthCombat.tower.damage).toBeGreaterThan(firstCombat.tower.damage);
  });
});
