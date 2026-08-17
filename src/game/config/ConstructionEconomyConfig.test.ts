import { describe, expect, it } from 'vitest';
import {
  createPrototypeConstructionEconomy,
  OBSTACLE_CONSTRUCTION_COST,
  ROUND_CONSTRUCTION_REWARD,
  STARTING_CONSTRUCTION_FUNDS,
  TOWER_CONSTRUCTION_COSTS,
} from './ConstructionEconomyConfig';

describe('ConstructionEconomyConfig', () => {
  it('starts with the approved prototype construction budget', () => {
    const economy = createPrototypeConstructionEconomy();

    expect(economy.funds).toBe(STARTING_CONSTRUCTION_FUNDS);
    expect(STARTING_CONSTRUCTION_FUNDS).toBe(15);
    expect(ROUND_CONSTRUCTION_REWARD).toBe(4);
  });

  it('prices the initial design at eleven parts, leaving four', () => {
    const initialDesignCost =
      TOWER_CONSTRUCTION_COSTS.popgun * 3 + OBSTACLE_CONSTRUCTION_COST;

    expect(initialDesignCost).toBe(11);
    expect(STARTING_CONSTRUCTION_FUNDS - initialDesignCost).toBe(4);
  });
});
