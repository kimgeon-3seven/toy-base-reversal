export type TowerAttackPattern =
  | { readonly kind: 'single' }
  | { readonly kind: 'splash'; readonly radiusInCells: number }
  | {
      readonly kind: 'pierce';
      readonly maxTargets: number;
      readonly secondaryDamageMultiplier: number;
      readonly corridorWidthInCells: number;
    };

export interface TowerCombatStats {
  readonly rangeInCells: number;
  readonly damage: number;
  readonly attackIntervalMs: number;
  readonly attackPattern: TowerAttackPattern;
}

export function isValidTowerCombatStats(stats: TowerCombatStats): boolean {
  if (
    stats.rangeInCells <= 0 ||
    stats.damage <= 0 ||
    stats.attackIntervalMs <= 0
  ) {
    return false;
  }

  if (stats.attackPattern.kind === 'splash') {
    return stats.attackPattern.radiusInCells > 0;
  }
  if (stats.attackPattern.kind === 'pierce') {
    return (
      Number.isInteger(stats.attackPattern.maxTargets) &&
      stats.attackPattern.maxTargets >= 2 &&
      stats.attackPattern.secondaryDamageMultiplier > 0 &&
      stats.attackPattern.secondaryDamageMultiplier <= 1 &&
      stats.attackPattern.corridorWidthInCells > 0
    );
  }
  return true;
}
