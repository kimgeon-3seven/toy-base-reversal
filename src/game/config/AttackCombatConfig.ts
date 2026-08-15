import type { AttackCombatConfig } from '../domain/attack/AttackCombat';
import { SquadPlan } from '../domain/attack/SquadPlan';

export const ATTACK_PREPARATION_DURATION_MS = 30_000;

export const PROTOTYPE_ATTACK_COMBAT_CONFIG: AttackCombatConfig = {
  coreMaxHealth: 170,
  timeLimitMs: 90_000,
  unitStats: {
    tank: {
      maxHealth: 125,
      movementSpeed: 1.15,
      attackDamage: 19,
      attackRange: 1.15,
      attackIntervalMs: 720,
    },
    ranger: {
      maxHealth: 62,
      movementSpeed: 1.5,
      attackDamage: 13,
      attackRange: 3.1,
      attackIntervalMs: 610,
    },
  },
  tower: {
    rangeInCells: 3.15,
    damage: 12,
    attackIntervalMs: 560,
  },
  commander: {
    maxHealth: 145,
    attackDamage: 8,
    attackRange: 2.4,
    attackIntervalMs: 650,
  },
  rallyDurationMs: 2_400,
  rallyCooldownMs: 7_000,
  disruptDurationMs: 3_200,
  disruptCooldownMs: 6_500,
  disruptRange: 4.2,
};

export function createPrototypeAttackCombatConfig(
  roundNumber = 1,
): AttackCombatConfig {
  const difficultyStep = Math.max(0, roundNumber - 1);
  return {
    ...PROTOTYPE_ATTACK_COMBAT_CONFIG,
    coreMaxHealth:
      PROTOTYPE_ATTACK_COMBAT_CONFIG.coreMaxHealth + difficultyStep * 8,
    unitStats: {
      tank: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.tank },
      ranger: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.ranger },
    },
    tower: {
      ...PROTOTYPE_ATTACK_COMBAT_CONFIG.tower,
      damage:
        PROTOTYPE_ATTACK_COMBAT_CONFIG.tower.damage +
        Math.floor(difficultyStep / 2),
    },
    commander: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.commander },
  };
}

export function createPrototypeSquadPlan(roundNumber = 1): SquadPlan {
  const attackBudget = 24 + Math.max(0, roundNumber - 1) * 3;
  const plan = new SquadPlan(attackBudget, 2);
  plan.addUnit(0, 'tank');
  plan.addUnit(0, 'ranger');
  plan.addUnit(1, 'tank');
  plan.addUnit(2, 'tank');
  plan.addUnit(2, 'ranger');
  plan.setCommanderLane(1);
  return plan;
}
