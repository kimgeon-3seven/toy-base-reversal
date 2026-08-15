import type { DefenseEnemyStats } from './DefenseEnemy';

export interface DefenseWaveSpawn {
  readonly delayMs: number;
  readonly entryIndex: number;
  readonly stats: DefenseEnemyStats;
}

export class DefenseWave {
  public readonly spawns: readonly DefenseWaveSpawn[];

  public constructor(spawns: readonly DefenseWaveSpawn[]) {
    if (spawns.some((spawn) => spawn.delayMs < 0 || spawn.entryIndex < 0)) {
      throw new Error('Wave spawn values cannot be negative.');
    }

    this.spawns = [...spawns].sort((left, right) => left.delayMs - right.delayMs);
  }
}
