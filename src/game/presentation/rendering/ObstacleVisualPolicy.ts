import type { DefenseStructure } from '../../domain/structures/DefenseStructure';

export type ObstacleDamageState = 'intact' | 'damaged' | 'critical';

export interface ObstacleVisualState {
  readonly rotationDegrees: 0 | 90;
  readonly damageState: ObstacleDamageState;
  readonly tint: number;
}

export class ObstacleVisualPolicy {
  public resolve(
    obstacle: DefenseStructure,
    structures: readonly DefenseStructure[],
  ): ObstacleVisualState {
    const neighbors = structures.filter(
      (candidate) =>
        candidate.kind === 'obstacle' && candidate.id !== obstacle.id,
    );
    const horizontalNeighbors = neighbors.filter(
      (candidate) =>
        candidate.position.row === obstacle.position.row &&
        Math.abs(candidate.position.column - obstacle.position.column) === 1,
    ).length;
    const verticalNeighbors = neighbors.filter(
      (candidate) =>
        candidate.position.column === obstacle.position.column &&
        Math.abs(candidate.position.row - obstacle.position.row) === 1,
    ).length;
    const healthRatio = obstacle.health / obstacle.maxHealth;
    const damageState: ObstacleDamageState =
      healthRatio > 0.66
        ? 'intact'
        : healthRatio > 0.33
          ? 'damaged'
          : 'critical';

    return {
      rotationDegrees: verticalNeighbors > horizontalNeighbors ? 90 : 0,
      damageState,
      tint:
        damageState === 'intact'
          ? 0xffffff
          : damageState === 'damaged'
            ? 0xffd3b8
            : 0xff8e82,
    };
  }
}
