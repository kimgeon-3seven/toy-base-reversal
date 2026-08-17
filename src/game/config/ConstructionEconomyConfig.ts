import type { TowerArchetype } from '../domain/combat/CombatArchetype';
import {
  ConstructionEconomy,
  FixedConstructionCostPolicy,
} from '../domain/economy/ConstructionEconomy';
import type { StructureKind } from '../domain/structures/DefenseStructure';

export const STARTING_CONSTRUCTION_FUNDS = 15;
export const ROUND_CONSTRUCTION_REWARD = 4;

export const TOWER_CONSTRUCTION_COSTS: Readonly<
  Record<TowerArchetype, number>
> = {
  popgun: 3,
  mortar: 5,
  piercer: 6,
};

export const OBSTACLE_CONSTRUCTION_COST = 2;

export function constructionCost(
  kind: StructureKind,
  towerArchetype: TowerArchetype | null,
): number {
  if (kind === 'obstacle') return OBSTACLE_CONSTRUCTION_COST;
  if (towerArchetype === null) {
    throw new Error('A tower construction cost requires an archetype.');
  }
  return TOWER_CONSTRUCTION_COSTS[towerArchetype];
}

export function createPrototypeConstructionEconomy(): ConstructionEconomy {
  return new ConstructionEconomy(
    STARTING_CONSTRUCTION_FUNDS,
    new FixedConstructionCostPolicy({
      towers: TOWER_CONSTRUCTION_COSTS,
      obstacle: OBSTACLE_CONSTRUCTION_COST,
    }),
  );
}
