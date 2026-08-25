import { describe, expect, it } from 'vitest';
import { TowerAttackPatternResolver } from './TowerAttackPatternResolver';
import type { TowerCombatStats } from './TowerCombatStats';

const resolver = new TowerAttackPatternResolver();

function stats(
  attackPattern: TowerCombatStats['attackPattern'],
): TowerCombatStats {
  return {
    rangeInCells: 5,
    damage: 10,
    attackIntervalMs: 1_000,
    attackPattern,
  };
}

describe('TowerAttackPatternResolver', () => {
  const source = { column: 0, row: 0 };
  const primary = { target: 'primary', column: 2, row: 0 };
  const aligned = { target: 'aligned', column: 3.5, row: 0.2 };
  const third = { target: 'third', column: 4.5, row: -0.1 };
  const fourth = { target: 'fourth', column: 4.8, row: 0.15 };
  const offAxis = { target: 'off-axis', column: 3, row: 1 };

  it('keeps single attacks on the primary target', () => {
    expect(
      resolver.resolve(source, primary, [primary, aligned], stats({ kind: 'single' })),
    ).toEqual([{ candidate: primary, damageMultiplier: 1 }]);
  });

  it('applies mortar splash around the impact point', () => {
    const nearImpact = { target: 'near', column: 2.4, row: 0.4 };
    const hits = resolver.resolve(
      source,
      primary,
      [primary, nearImpact, offAxis],
      stats({ kind: 'splash', radiusInCells: 0.7 }),
    );

    expect(hits.map((hit) => hit.candidate.target)).toEqual(['primary', 'near']);
    expect(hits.every((hit) => hit.damageMultiplier === 1)).toBe(true);
  });

  it('pierces up to three aligned targets and weakens secondary hits', () => {
    const hits = resolver.resolve(
      source,
      primary,
      [primary, aligned, third, fourth, offAxis],
      stats({
        kind: 'pierce',
        maxTargets: 3,
        secondaryDamageMultiplier: 0.6,
        corridorWidthInCells: 0.4,
      }),
    );

    expect(hits.map((hit) => hit.candidate.target)).toEqual([
      'primary',
      'aligned',
      'third',
    ]);
    expect(hits.map((hit) => hit.damageMultiplier)).toEqual([1, 0.6, 0.6]);
  });
});
