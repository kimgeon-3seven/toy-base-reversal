import type { CombatPoint } from './CombatEvent';
import type { TowerCombatStats } from './TowerCombatStats';

export interface TowerAttackCandidate<TTarget> extends CombatPoint {
  readonly target: TTarget;
}

export interface TowerAttackHit<TTarget> {
  readonly candidate: TowerAttackCandidate<TTarget>;
  readonly damageMultiplier: number;
}

export class TowerAttackPatternResolver {
  public resolve<TTarget>(
    source: CombatPoint,
    primary: TowerAttackCandidate<TTarget>,
    candidates: readonly TowerAttackCandidate<TTarget>[],
    stats: TowerCombatStats,
  ): readonly TowerAttackHit<TTarget>[] {
    const pattern = stats.attackPattern;
    if (pattern.kind === 'single') {
      return [{ candidate: primary, damageMultiplier: 1 }];
    }
    if (pattern.kind === 'splash') {
      return candidates
        .filter(
          (candidate) =>
            this.distance(candidate, primary) <= pattern.radiusInCells,
        )
        .map((candidate) => ({ candidate, damageMultiplier: 1 }));
    }

    const directionColumn = primary.column - source.column;
    const directionRow = primary.row - source.row;
    const directionLength = Math.hypot(directionColumn, directionRow);
    if (directionLength === 0) {
      return [{ candidate: primary, damageMultiplier: 1 }];
    }
    const unitColumn = directionColumn / directionLength;
    const unitRow = directionRow / directionLength;
    const alignedSecondaries = candidates
      .filter((candidate) => candidate !== primary)
      .map((candidate) => {
        const relativeColumn = candidate.column - source.column;
        const relativeRow = candidate.row - source.row;
        return {
          candidate,
          projection: relativeColumn * unitColumn + relativeRow * unitRow,
          perpendicularDistance: Math.abs(
            relativeColumn * unitRow - relativeRow * unitColumn,
          ),
        };
      })
      .filter(
        ({ projection, perpendicularDistance }) =>
          projection >= directionLength &&
          projection <= stats.rangeInCells &&
          perpendicularDistance <= pattern.corridorWidthInCells,
      )
      .sort((left, right) => left.projection - right.projection)
      .slice(0, pattern.maxTargets - 1);

    return [
      { candidate: primary, damageMultiplier: 1 },
      ...alignedSecondaries.map(({ candidate }) => ({
        candidate,
        damageMultiplier: pattern.secondaryDamageMultiplier,
      })),
    ];
  }

  private distance(left: CombatPoint, right: CombatPoint): number {
    return Math.hypot(left.column - right.column, left.row - right.row);
  }
}
