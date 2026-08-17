import type { UnitArchetype } from './CombatArchetype';

const UNIT_COSTS: Readonly<Record<UnitArchetype, number>> = {
  tank: 4,
  swarm: 2,
  ranger: 3,
};

export function unitCost(archetype: UnitArchetype): number {
  return UNIT_COSTS[archetype];
}
