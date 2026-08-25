import { describe, expect, it } from 'vitest';
import {
  towerDamageMultiplier,
  type TowerArchetype,
  type UnitArchetype,
} from '../domain/combat/CombatArchetype';
import { unitCost } from '../domain/combat/UnitEconomy';
import { PROTOTYPE_ATTACK_COMBAT_CONFIG } from './AttackCombatConfig';

function shotsToDefeat(health: number, damage: number): number {
  return Math.ceil(health / damage);
}

function towerDamageAgainst(
  tower: TowerArchetype,
  unit: UnitArchetype,
): number {
  return (
    PROTOTYPE_ATTACK_COMBAT_CONFIG.towers[tower].damage *
    towerDamageMultiplier(tower, unit)
  );
}

function damagePerSecondPerPoint(unit: UnitArchetype): number {
  const stats = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats[unit];
  return (stats.attackDamage / (stats.attackIntervalMs / 1_000)) / unitCost(unit);
}

describe('attack unit role balance', () => {
  it('gives an equal-cost swarm enough durability to compete with a tank', () => {
    const tank = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.tank;
    const swarm = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.swarm;
    const equalCostSwarmCount = unitCost('tank') / unitCost('swarm');
    const equalCostSwarmHealth = swarm.maxHealth * equalCostSwarmCount;

    expect(equalCostSwarmHealth).toBe(100);
    expect(equalCostSwarmHealth).toBeGreaterThanOrEqual(tank.maxHealth * 0.8);
    expect(equalCostSwarmHealth).toBeLessThan(tank.maxHealth);
    expect(damagePerSecondPerPoint('swarm')).toBeGreaterThan(
      damagePerSecondPerPoint('tank'),
    );
  });

  it('keeps the swarm viable against single-target fire at equal cost', () => {
    const tank = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.tank;
    const swarm = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.swarm;
    const popgunDamage = towerDamageAgainst('popgun', 'swarm');
    const equalCostSwarmCount = unitCost('tank') / unitCost('swarm');

    const tankShots = shotsToDefeat(
      tank.maxHealth,
      towerDamageAgainst('popgun', 'tank'),
    );
    const swarmShots =
      shotsToDefeat(swarm.maxHealth, popgunDamage) * equalCostSwarmCount;

    expect(swarmShots).toBeGreaterThanOrEqual(tankShots - 2);
    expect(swarmShots).toBeLessThan(tankShots);
  });

  it('preserves mortar splash as the swarm hard counter', () => {
    const swarm = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.swarm;
    const mortarDamage = towerDamageAgainst('mortar', 'swarm');

    expect(towerDamageMultiplier('mortar', 'swarm')).toBeGreaterThan(1);
    expect(shotsToDefeat(swarm.maxHealth, mortarDamage)).toBe(2);
  });

  it('preserves swarm efficiency against the piercer it counters', () => {
    const tank = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.tank;
    const swarm = PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.swarm;
    const equalCostSwarmCount = unitCost('tank') / unitCost('swarm');

    const shotsForTank = shotsToDefeat(
      tank.maxHealth,
      towerDamageAgainst('piercer', 'tank'),
    );
    const shotsForSwarms =
      shotsToDefeat(
        swarm.maxHealth,
        towerDamageAgainst('piercer', 'swarm'),
      ) * equalCostSwarmCount;

    expect(shotsForTank).toBe(3);
    expect(shotsForSwarms).toBe(4);
  });
});
