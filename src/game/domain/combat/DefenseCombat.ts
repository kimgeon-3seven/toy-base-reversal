import type { Battlefield } from '../battlefield/Battlefield';
import type { GridPosition } from '../grid/GridPosition';
import type { DefenseStructure } from '../structures/DefenseStructure';
import type { TowerUpgradePolicy } from '../structures/TowerUpgradePolicy';
import {
  towerDamageMultiplier,
  unitDamageMultiplier,
  type TowerArchetype,
} from './CombatArchetype';
import type { CombatEvent } from './CombatEvent';
import type { CoreLeakDamagePolicy } from './CoreLeakDamagePolicy';
import { DefenseEnemy } from './DefenseEnemy';
import type { DefenseWave } from './DefenseWave';
import { TowerAttackPatternResolver } from './TowerAttackPatternResolver';
import {
  isValidTowerCombatStats,
  type TowerCombatStats,
} from './TowerCombatStats';

export type DefenseCombatState = 'running' | 'won' | 'lost';

export interface DefenseCombatConfig {
  readonly coreMaxHealth: number;
  readonly coreLeakDamagePolicy: CoreLeakDamagePolicy;
  readonly towerUpgradePolicy: TowerUpgradePolicy;
  readonly towers: Readonly<Record<TowerArchetype, TowerCombatStats>>;
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
  private breachedEnemies = 0;
  private appliedCoreLeakDamage = 0;
  private readonly pendingEvents: CombatEvent[] = [];
  private readonly towerAttackPatternResolver = new TowerAttackPatternResolver();

  public constructor(
    public readonly battlefield: Battlefield,
    private readonly wave: DefenseWave,
    public readonly config: DefenseCombatConfig,
  ) {
    if (
      config.coreMaxHealth <= 0 ||
      Object.values(config.towers).some(
        (tower) => !isValidTowerCombatStats(tower),
      )
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

  public get leakCount(): number {
    return this.breachedEnemies;
  }

  public get leakDamage(): number {
    return this.appliedCoreLeakDamage;
  }

  public get remainingSpawnCount(): number {
    return this.wave.spawns.length - this.nextSpawnIndex;
  }

  public drainEvents(): readonly CombatEvent[] {
    return this.pendingEvents.splice(0);
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
      const towerArchetype = tower.towerArchetype;
      if (towerArchetype === null) continue;
      const towerStats = this.config.towers[towerArchetype];
      const remainingCooldown = Math.max(
        0,
        (this.towerCooldowns.get(tower.id) ?? 0) - deltaMs,
      );
      this.towerCooldowns.set(tower.id, remainingCooldown);

      if (remainingCooldown > 0) {
        continue;
      }

      const target = this.nearestEnemyInRange(tower, towerStats);
      if (target === null) {
        continue;
      }

      const candidates = this.enemies.map((enemy) => ({
        target: enemy,
        column: enemy.renderColumn,
        row: enemy.renderRow,
      }));
      const primary = candidates.find((candidate) => candidate.target === target);
      if (primary === undefined) continue;
      const hits = this.towerAttackPatternResolver.resolve(
        tower.position,
        primary,
        candidates,
        towerStats,
      );
      const upgradeMultiplier =
        this.config.towerUpgradePolicy.damageMultiplier(tower);
      for (const hit of hits) {
        const enemy = hit.candidate.target;
        enemy.takeDamage(
          towerStats.damage *
            upgradeMultiplier *
            towerDamageMultiplier(towerArchetype, enemy.stats.archetype) *
            hit.damageMultiplier,
        );
      }
      const targetMultiplier = towerDamageMultiplier(
        towerArchetype,
        target.stats.archetype,
      );
      this.pendingEvents.push({
        type: 'attack',
        style: towerArchetype,
        sourceId: tower.id,
        source: {
          column: tower.position.column,
          row: tower.position.row,
        },
        target: {
          column: target.renderColumn,
          row: target.renderRow,
        },
        secondaryTargets: hits.slice(1).map(({ candidate }) => ({
          column: candidate.column,
          row: candidate.row,
        })),
        damage: towerStats.damage * upgradeMultiplier * targetMultiplier,
        effectiveness: targetMultiplier > 1 ? 'favored' : 'normal',
      });
      this.towerCooldowns.set(tower.id, towerStats.attackIntervalMs);
    }
  }

  private nearestEnemyInRange(
    tower: DefenseStructure,
    towerStats: TowerCombatStats,
  ): DefenseEnemy | null {
    let nearest: DefenseEnemy | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      const distance = this.distanceBetween(
        tower.position,
        enemy.renderColumn,
        enemy.renderRow,
      );
      if (
        distance <= towerStats.rangeInCells &&
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

      if (enemy.position.equals(this.battlefield.map.corePosition)) {
        this.resolveCoreBreach(enemy);
        continue;
      }

      const structureTarget = this.nearestStructureInRange(
        enemy.position,
        enemy.stats.attackRange,
      );
      if (structureTarget !== null) {
        this.attackStructure(enemy, structureTarget);
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

    const damageMultiplier = unitDamageMultiplier(
      enemy.stats.archetype,
      structure.towerArchetype,
    );
    const damage = enemy.stats.attackDamage * damageMultiplier;
    structure.takeDamage(damage);
    this.pendingEvents.push({
      type: 'attack',
      style: 'unit',
      sourceId: enemy.id,
      source: {
        column: enemy.renderColumn,
        row: enemy.renderRow,
      },
      target: {
        column: structure.position.column,
        row: structure.position.row,
      },
      damage,
      effectiveness: damageMultiplier > 1 ? 'favored' : 'normal',
    });
    enemy.consumeAttack();
    if (structure.health === 0) {
      this.pendingEvents.push({
        type: 'destroyed',
        targetKind: 'structure',
        position: {
          column: structure.position.column,
          row: structure.position.row,
        },
      });
      this.battlefield.destroy(structure.id);
      this.towerCooldowns.delete(structure.id);
    }
  }

  private resolveCoreBreach(enemy: DefenseEnemy): void {
    enemy.cancelMovement();
    const configuredDamage = this.config.coreLeakDamagePolicy.damageForCost(
      enemy.stats.cost,
    );
    const appliedDamage = Math.min(this.currentCoreHealth, configuredDamage);
    this.currentCoreHealth = Math.max(
      0,
      this.currentCoreHealth - configuredDamage,
    );
    this.appliedCoreLeakDamage += appliedDamage;
    this.breachedEnemies += 1;
    this.pendingEvents.push({
      type: 'core-hit',
      position: {
        column: this.battlefield.map.corePosition.column,
        row: this.battlefield.map.corePosition.row,
      },
      damage: appliedDamage,
    });
    this.enemiesById.delete(enemy.id);
  }

  private nearestStructureInRange(
    position: GridPosition,
    range: number,
  ): DefenseStructure | null {
    return (
      [...this.battlefield.structures]
        .filter(
          (structure) =>
            this.distanceBetweenPositions(position, structure.position) <= range,
        )
        .sort(
          (left, right) =>
            this.distanceBetweenPositions(position, left.position) -
            this.distanceBetweenPositions(position, right.position),
        )[0] ?? null
    );
  }

  private removeDefeatedEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
        continue;
      }

      this.pendingEvents.push({
        type: 'destroyed',
        targetKind: 'unit',
        position: {
          column: enemy.renderColumn,
          row: enemy.renderRow,
        },
      });
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

  private distanceBetweenPositions(
    left: GridPosition,
    right: GridPosition,
  ): number {
    return this.distanceBetweenCoordinates(
      left.column,
      left.row,
      right.column,
      right.row,
    );
  }

  private distanceBetweenCoordinates(
    leftColumn: number,
    leftRow: number,
    rightColumn: number,
    rightRow: number,
  ): number {
    return Math.hypot(leftColumn - rightColumn, leftRow - rightRow);
  }
}
