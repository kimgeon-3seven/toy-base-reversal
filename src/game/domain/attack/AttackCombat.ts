import type { Battlefield } from '../battlefield/Battlefield';
import { GridPosition } from '../grid/GridPosition';
import type { DefenseStructure } from '../structures/DefenseStructure';
import { AttackCommander } from './AttackCommander';
import { AttackUnit, type AttackUnitStats } from './AttackUnit';
import type { AttackUnitKind, SquadPlan, SquadSpawn } from './SquadPlan';

export type AttackCombatState = 'running' | 'won' | 'lost';
export type AttackFailureReason = 'commander-defeated' | 'time-limit' | null;

export interface AttackCombatConfig {
  readonly coreMaxHealth: number;
  readonly timeLimitMs: number;
  readonly unitStats: Readonly<Record<AttackUnitKind, AttackUnitStats>>;
  readonly tower: {
    readonly rangeInCells: number;
    readonly damage: number;
    readonly attackIntervalMs: number;
  };
  readonly commander: {
    readonly maxHealth: number;
    readonly attackDamage: number;
    readonly attackRange: number;
    readonly attackIntervalMs: number;
  };
  readonly rallyDurationMs: number;
  readonly rallyCooldownMs: number;
  readonly disruptDurationMs: number;
  readonly disruptCooldownMs: number;
  readonly disruptRange: number;
}

export class AttackCombat {
  private readonly unitsById = new Map<string, AttackUnit>();
  private readonly schedule: readonly SquadSpawn[];
  private readonly towerCooldowns = new Map<string, number>();
  private readonly disabledTowerRemainingMs = new Map<string, number>();
  private nextSpawnIndex = 0;
  private elapsedMs = 0;
  private unitSequence = 1;
  private currentCoreHealth: number;
  private currentState: AttackCombatState = 'running';
  private currentFailureReason: AttackFailureReason = null;
  private rallyRemainingMs = 0;

  public readonly commander: AttackCommander;

  public constructor(
    public readonly battlefield: Battlefield,
    squadPlan: SquadPlan,
    public readonly config: AttackCombatConfig,
  ) {
    this.schedule = squadPlan.buildSpawnSchedule();
    const commanderStart = battlefield.map.entryPoints[squadPlan.commanderLane];
    if (commanderStart === undefined) {
      throw new Error('Commander entry point does not exist.');
    }
    this.commander = new AttackCommander(
      commanderStart,
      config.commander.maxHealth,
      config.commander.attackDamage,
      config.commander.attackRange,
      config.commander.attackIntervalMs,
    );
    this.currentCoreHealth = config.coreMaxHealth;
  }

  public get units(): readonly AttackUnit[] {
    return [...this.unitsById.values()];
  }

  public get coreHealth(): number {
    return this.currentCoreHealth;
  }

  public get coreHealthRatio(): number {
    return this.currentCoreHealth / this.config.coreMaxHealth;
  }

  public get state(): AttackCombatState {
    return this.currentState;
  }

  public get failureReason(): AttackFailureReason {
    return this.currentFailureReason;
  }

  public get remainingTimeMs(): number {
    return Math.max(0, this.config.timeLimitMs - this.elapsedMs);
  }

  public get elapsedTimeMs(): number {
    return Math.min(this.elapsedMs, this.config.timeLimitMs);
  }

  public get remainingSpawnCount(): number {
    return this.schedule.length - this.nextSpawnIndex;
  }

  public get isRallyActive(): boolean {
    return this.rallyRemainingMs > 0;
  }

  public update(deltaMs: number): void {
    if (this.currentState !== 'running') return;
    let remainingMs = Math.max(0, deltaMs);
    while (remainingMs > 0 && this.currentState === 'running') {
      const stepMs = Math.min(50, remainingMs);
      this.simulateStep(stepMs);
      remainingMs -= stepMs;
    }
  }

  public moveCommander(columnDelta: number, rowDelta: number): boolean {
    if (this.currentState !== 'running' || !this.commander.isAlive) return false;
    const target = new GridPosition(
      this.commander.position.column + columnDelta,
      this.commander.position.row + rowDelta,
    );
    if (
      !this.battlefield.map.contains(target) ||
      this.battlefield.findStructureAt(target) !== null
    ) {
      return false;
    }
    this.commander.moveTo(target);
    return true;
  }

  public activateRally(): boolean {
    if (!this.commander.consumeRally(this.config.rallyCooldownMs)) return false;
    this.rallyRemainingMs = this.config.rallyDurationMs;
    return true;
  }

  public activateDisrupt(): string | null {
    if (!this.commander.canDisrupt) return null;
    const tower = this.nearestTowerToCommander(this.config.disruptRange);
    if (tower === null) return null;
    this.commander.consumeDisrupt(this.config.disruptCooldownMs);
    this.disabledTowerRemainingMs.set(tower.id, this.config.disruptDurationMs);
    return tower.id;
  }

  public isTowerDisabled(towerId: string): boolean {
    return (this.disabledTowerRemainingMs.get(towerId) ?? 0) > 0;
  }

  private simulateStep(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.rallyRemainingMs = Math.max(0, this.rallyRemainingMs - deltaMs);
    this.commander.updateCooldowns(deltaMs);
    this.updateDisabledTowers(deltaMs);
    this.spawnReadyUnits();
    this.updateTowerAttacks(deltaMs);
    this.removeDefeatedUnits();

    if (!this.commander.isAlive) {
      this.currentState = 'lost';
      this.currentFailureReason = 'commander-defeated';
      return;
    }

    this.updateUnits(deltaMs);
    this.updateCommanderAttack();
    this.removeDestroyedStructures();

    if (this.currentCoreHealth === 0) {
      this.currentState = 'won';
    } else if (this.elapsedMs >= this.config.timeLimitMs) {
      this.currentState = 'lost';
      this.currentFailureReason = 'time-limit';
    }
  }

  private spawnReadyUnits(): void {
    while (this.nextSpawnIndex < this.schedule.length) {
      const spawn = this.schedule[this.nextSpawnIndex];
      if (spawn === undefined || spawn.delayMs > this.elapsedMs) return;
      const entry = this.battlefield.map.entryPoints[spawn.laneIndex];
      if (entry === undefined) throw new Error('Squad lane does not exist.');
      const unit = new AttackUnit(
        `attacker-${this.unitSequence}`,
        spawn.kind,
        entry,
        this.config.unitStats[spawn.kind],
      );
      this.unitSequence += 1;
      this.unitsById.set(unit.id, unit);
      this.nextSpawnIndex += 1;
    }
  }

  private updateTowerAttacks(deltaMs: number): void {
    for (const tower of this.battlefield.structures.filter(
      (structure) => structure.kind === 'tower',
    )) {
      const cooldown = Math.max(
        0,
        (this.towerCooldowns.get(tower.id) ?? 0) - deltaMs,
      );
      this.towerCooldowns.set(tower.id, cooldown);
      if (cooldown > 0 || this.isTowerDisabled(tower.id)) continue;

      const targets = [
        ...this.units.map((unit) => ({
          distance: this.distance(
            tower.position.column,
            tower.position.row,
            unit.renderColumn,
            unit.renderRow,
          ),
          damage: () => unit.takeDamage(this.config.tower.damage),
        })),
        {
          distance: this.distanceBetweenPositions(
            tower.position,
            this.commander.position,
          ),
          damage: () => this.commander.takeDamage(this.config.tower.damage),
        },
      ]
        .filter((target) => target.distance <= this.config.tower.rangeInCells)
        .sort((left, right) => left.distance - right.distance);
      const target = targets[0];
      if (target === undefined) continue;
      target.damage();
      this.towerCooldowns.set(tower.id, this.config.tower.attackIntervalMs);
    }
  }

  private updateUnits(deltaMs: number): void {
    for (const unit of this.units) {
      unit.updateCooldown(deltaMs);
      const target = this.nearestStructureInRange(
        unit.renderColumn,
        unit.renderRow,
        unit.stats.attackRange,
      );
      if (target !== null) {
        unit.cancelMovement();
        if (unit.canAttack()) {
          target.takeDamage(unit.stats.attackDamage);
          unit.consumeAttack();
        }
        continue;
      }

      if (
        this.distance(
          unit.renderColumn,
          unit.renderRow,
          this.battlefield.map.corePosition.column,
          this.battlefield.map.corePosition.row,
        ) <= unit.stats.attackRange
      ) {
        unit.cancelMovement();
        if (unit.canAttack()) {
          this.currentCoreHealth = Math.max(
            0,
            this.currentCoreHealth - unit.stats.attackDamage,
          );
          unit.consumeAttack();
        }
        continue;
      }

      const next = this.isRallyActive
        ? this.nextRallyPosition(unit.position)
        : this.battlefield.findPathFrom(unit.position)?.[1];
      if (next !== undefined && next !== null) {
        unit.advanceToward(next, deltaMs, this.isRallyActive ? 1.35 : 1);
      }
    }
  }

  private updateCommanderAttack(): void {
    if (!this.commander.canAttack()) return;
    const target = this.nearestStructureInRange(
      this.commander.position.column,
      this.commander.position.row,
      this.commander.attackRange,
    );
    if (target !== null) {
      target.takeDamage(this.commander.attackDamage);
      this.commander.consumeAttack();
      return;
    }
    if (
      this.distanceBetweenPositions(
        this.commander.position,
        this.battlefield.map.corePosition,
      ) <= this.commander.attackRange
    ) {
      this.currentCoreHealth = Math.max(
        0,
        this.currentCoreHealth - this.commander.attackDamage,
      );
      this.commander.consumeAttack();
    }
  }

  private nextRallyPosition(position: GridPosition): GridPosition | null {
    if (this.distanceBetweenPositions(position, this.commander.position) <= 1) {
      return null;
    }
    return (
      [...this.battlefield.walkableNeighborsOf(position)].sort(
        (left, right) =>
          this.distanceBetweenPositions(left, this.commander.position) -
          this.distanceBetweenPositions(right, this.commander.position),
      )[0] ?? null
    );
  }

  private nearestStructureInRange(
    column: number,
    row: number,
    range: number,
  ): DefenseStructure | null {
    return (
      [...this.battlefield.structures]
        .filter(
          (structure) =>
            this.distance(
              column,
              row,
              structure.position.column,
              structure.position.row,
            ) <= range,
        )
        .sort(
          (left, right) =>
            this.distance(
              column,
              row,
              left.position.column,
              left.position.row,
            ) -
            this.distance(
              column,
              row,
              right.position.column,
              right.position.row,
            ),
        )[0] ?? null
    );
  }

  private nearestTowerToCommander(range: number): DefenseStructure | null {
    return (
      [...this.battlefield.structures]
        .filter(
          (structure) =>
            structure.kind === 'tower' &&
            this.distanceBetweenPositions(
              structure.position,
              this.commander.position,
            ) <= range,
        )
        .sort(
          (left, right) =>
            this.distanceBetweenPositions(left.position, this.commander.position) -
            this.distanceBetweenPositions(right.position, this.commander.position),
        )[0] ?? null
    );
  }

  private updateDisabledTowers(deltaMs: number): void {
    for (const [towerId, remaining] of this.disabledTowerRemainingMs) {
      const nextRemaining = Math.max(0, remaining - deltaMs);
      if (nextRemaining === 0) this.disabledTowerRemainingMs.delete(towerId);
      else this.disabledTowerRemainingMs.set(towerId, nextRemaining);
    }
  }

  private removeDefeatedUnits(): void {
    for (const unit of this.units) {
      if (!unit.isAlive) this.unitsById.delete(unit.id);
    }
  }

  private removeDestroyedStructures(): void {
    for (const structure of this.battlefield.structures) {
      if (structure.health === 0) {
        this.battlefield.destroy(structure.id);
        this.towerCooldowns.delete(structure.id);
        this.disabledTowerRemainingMs.delete(structure.id);
      }
    }
  }

  private distanceBetweenPositions(left: GridPosition, right: GridPosition): number {
    return this.distance(left.column, left.row, right.column, right.row);
  }

  private distance(
    leftColumn: number,
    leftRow: number,
    rightColumn: number,
    rightRow: number,
  ): number {
    return Math.hypot(leftColumn - rightColumn, leftRow - rightRow);
  }
}
