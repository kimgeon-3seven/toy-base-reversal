import { describe, expect, it } from 'vitest';
import { DefenseStructure } from '../structures/DefenseStructure';
import { GridPosition } from '../grid/GridPosition';
import {
  ConstructionEconomy,
  FixedConstructionCostPolicy,
} from './ConstructionEconomy';

function createEconomy(initialFunds = 15): ConstructionEconomy {
  return new ConstructionEconomy(
    initialFunds,
    new FixedConstructionCostPolicy({
      towers: { popgun: 3, mortar: 5, piercer: 6 },
      obstacle: 2,
    }),
  );
}

describe('ConstructionEconomy', () => {
  it('uses the configured cost for every structure type', () => {
    const economy = createEconomy();

    expect(economy.costFor('tower', 'popgun')).toBe(3);
    expect(economy.costFor('tower', 'mortar')).toBe(5);
    expect(economy.costFor('tower', 'piercer')).toBe(6);
    expect(economy.costFor('obstacle', null)).toBe(2);
  });

  it('spends, carries, grants, and refunds construction funds', () => {
    const economy = createEconomy(6);

    expect(economy.spend(5)).toBe(true);
    expect(economy.spend(2)).toBe(false);
    economy.grant(4);
    economy.refund(3);

    expect(economy.funds).toBe(8);
  });

  it('resolves a refund from the sold structure archetype', () => {
    const economy = createEconomy();
    const mortar = new DefenseStructure(
      'mortar',
      'tower',
      new GridPosition(1, 1),
      115,
      'mortar',
    );

    expect(economy.costForStructure(mortar)).toBe(5);
  });

  it('rejects invalid balances and cost tables', () => {
    expect(() => createEconomy(-1)).toThrow();
    expect(
      () =>
        new FixedConstructionCostPolicy({
          towers: { popgun: 0, mortar: 5, piercer: 6 },
          obstacle: 2,
        }),
    ).toThrow();
  });
});
