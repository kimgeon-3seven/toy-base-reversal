import { describe, expect, it } from 'vitest';
import {
  createPrototypeAttackCombatConfig,
} from './AttackCombatConfig';
import { createPrototypeSquadPlan } from './AttackSquadConfig';
import {
  createPrototypeDefenseWave,
  defenseWaveCountForRound,
} from './DefenseCombatConfig';

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
    expect(fifthCombat.towers.popgun.damage).toBeGreaterThan(
      firstCombat.towers.popgun.damage,
    );
  });

  it('applies the approved capped challenge-mode pressure curve', () => {
    const fifthWave = createPrototypeDefenseWave(5);
    const sixthWave = createPrototypeDefenseWave(6);
    const twentiethWave = createPrototypeDefenseWave(20);

    expect([5, 6, 7, 10, 11, 20].map(defenseWaveCountForRound)).toEqual([
      7, 8, 9, 12, 12, 12,
    ]);
    expect(sixthWave.spawns[0]?.stats.maxHealth).toBeGreaterThan(
      fifthWave.spawns[0]?.stats.maxHealth ?? 0,
    );
    expect(twentiethWave.spawns[0]?.stats.attackDamage).toBeGreaterThan(
      sixthWave.spawns[0]?.stats.attackDamage ?? 0,
    );
  });

  it('caps challenge sortie points while core durability keeps growing', () => {
    expect(createPrototypeSquadPlan(20).totalBudget).toBe(48);
    expect(createPrototypeAttackCombatConfig(7).coreMaxHealth).toBe(3_600);
    expect(createPrototypeAttackCombatConfig(20).coreMaxHealth).toBeGreaterThan(
      createPrototypeAttackCombatConfig(7).coreMaxHealth,
    );
  });
});
