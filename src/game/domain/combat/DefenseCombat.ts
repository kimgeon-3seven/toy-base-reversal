import type { Battlefield } from '../battlefield/Battlefield';
import type { GridPosition } from '../grid/GridPosition';
import type { DefenseStructure } from '../structures/DefenseStructure';
import { DefenseEnemy } from './DefenseEnemy';
import type { DefenseWave } from './DefenseWave';

export type DefenseCombatState = 'running' | 'won' | 'lost';

export interface TowerCombatStats {
  readonly rangeInCells: number;
  readonly damage: number;
  readonly attackIntervalMs: number;
}

export interface DefenseCombatConfig {
  readonly coreMaxHealth: number;
  readonly tower: TowerCombatStats;
}

export class DefenseCombat {
  private readonly enemiesById = new Map<string, DefenseEnemy>();
  private readonly towerCooldowns = new Map<string, number>();
  private elapsedMs = 0;
  private nextSpawnIndex = 0;
  private enemySequence = 1;
  private currentCoreHealth: number;
  private currentState: DefenseCombatState = 'running';
  private defeatedEnemies = 0;

  public constructor(
    public readonly battlefield: Battlefield,
    private readonly wave: DefenseWave,
    public readonly config: DefenseCombatConfig,
  ) {
    if (
      config.coreMaxHealth <= 0 ||
      config.tower.rangeInCells <= 0 ||
      config.tower.damage <= 0 ||
      config.tower.attackIntervalMs <= 0
    ) {
      throw new Error('Defense combat configuration values must be positive.');
    }

    this.currentCoreHealth = config.coreMaxHealth;
  }

  public get enemies(): readonly DefenseEnemy[] {
    return [...this.enemiesById.values()];
  }

  public get coreHealth(): number {
    return this.currentCoreHealth;
  }

  public get coreHealthRatio(): number {
    return this.currentCoreHealth / this.config.coreMaxHealth;
  }

  public get state(): DefenseCombatState {
    return this.currentState;
  }

  public get killCount(): number {
    return this.defeatedEnemies;
  }

  public get remainingSpawnCount(): number {
    return this.wave.spawns.length - this.nextSpawnIndex;
  }

  public update(deltaMs: number): void {
    if (deltaMs < 0) {
      throw new Error('Combat delta time cannot be negative.');
    }

    if (this.currentState !== 'running') {
      return;
    }

    let remainingMs = deltaMs;
    while (remainingMs > 0 && this.currentState === 'running') {
      const stepMs = Math.min(50, remainingMs);
      this.simulateStep(stepMs);
      remainingMs -= stepMs;
    }
  }

  private simulateStep(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.spawnReadyEnemies();
    this.updateTowerAttacks(deltaMs);
    this.removeDefeatedEnemies();
    this.updateEnemies(deltaMs);
    this.removeDefeatedEnemies();
    this.updateOutcome();
  }

  private spawnReadyEnemies(): void {
    while (this.nextSpawnIndex < this.wave.spawns.length) {
      const spawn = this.wave.spawns[this.nextSpawnIndex];
      if (spawn === undefined || spawn.delayMs > this.elapsedMs) {
        return;
      }

      const entryPoint = this.battlefield.map.entryPoints[spawn.entryIndex];
      if (entryPoint === undefined) {
        throw new Error(`Wave references missing entry index ${spawn.entryIndex}.`);
      }

      const enemy = new DefenseEnemy(
        `enemy-${this.enemySequence}`,
        entryPoint,
        spawn.stats,
      );
      this.enemySequence += 1;
      this.enemiesById.set(enemy.id, enemy);
      this.nextSpawnIndex += 1;
    }
  }

  private updateTowerAttacks(deltaMs: number): void {
    for (const tower of this.battlefield.structures.filter(
      (structure) => structure.kind === 'tower',
    )) {
      const remainingCooldown = Math.max(
        0,
        (this.towerCooldowns.get(tower.id) ?? 0) - deltaMs,
      );
      this.towerCooldowns.set(tower.id, remainingCooldown);

      if (remainingCooldown > 0) {
        continue;
      }

      const target = this.nearestEnemyInRange(tower);
      if (target === null) {
        continue;
      }

      target.takeDamage(this.config.tower.damage);
      this.towerCooldowns.set(tower.id, this.config.tower.attackIntervalMs);
    }
  }

  private nearestEnemyInRange(tower: DefenseStructure): DefenseEnemy | null {
    let nearest: DefenseEnemy | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      const distance = this.distanceBetween(
        tower.position,
        enemy.renderColumn,
        enemy.renderRow,
      );
      if (
        distance <= this.config.tower.rangeInCells &&
        distance < nearestDistance
      ) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private updateEnemies(deltaMs: number): void {
    for (const enemy of this.enemies) {
      enemy.updateCooldown(deltaMs);

      const adjacentStructure = this.adjacentStructureTo(enemy.position);
      if (adjacentStructure !== null) {
        this.attackStructure(enemy, adjacentStructure);
        continue;
      }

      if (enemy.position.equals(this.battlefield.map.corePosition)) {
        this.attackCore(enemy);
        continue;
      }

      const path = this.battlefield.findPathFrom(enemy.position);
      const nextPosition = path?.[1];
      if (nextPosition !== undefined) {
        enemy.advanceToward(nextPosition, deltaMs);
      }
    }
  }

  private attackStructure(
    enemy: DefenseEnemy,
    structure: DefenseStructure,
  ): void {
    enemy.cancelMovement();
    if (!enemy.canAttack()) {
      return;
    }

    structure.takeDamage(enemy.stats.attackDamage);
    enemy.consumeAttack();
    if (structure.health === 0) {
      this.battlefield.destroy(structure.id);
      this.towerCooldowns.delete(structure.id);
    }
  }

  private attackCore(enemy: DefenseEnemy): void {
    enemy.cancelMovement();
    if (!enemy.canAttack()) {
      return;
    }

    this.currentCoreHealth = Math.max(
      0,
      this.currentCoreHealth - enemy.stats.attackDamage,
    );
    enemy.consumeAttack();
  }

  private adjacentStructureTo(position: GridPosition): DefenseStructure | null {
    return (
      this.battlefield.structures.find(
        (structure) =>
          Math.abs(structure.position.column - position.column) +
            Math.abs(structure.position.row - position.row) ===
          1,
      ) ?? null
    );
  }

  private removeDefeatedEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
        continue;
      }

      this.enemiesById.delete(enemy.id);
      this.defeatedEnemies += 1;
    }
  }

  private updateOutcome(): void {
    if (this.currentCoreHealth === 0) {
      this.currentState = 'lost';
      return;
    }

    if (
      this.nextSpawnIndex === this.wave.spawns.length &&
      this.enemiesById.size === 0
    ) {
      this.currentState = 'won';
    }
  }

  private distanceBetween(
    left: GridPosition,
    rightColumn: number,
    rightRow: number,
  ): number {
    return Math.hypot(
      left.column - rightColumn,
      left.row - rightRow,
    );
  }
}
