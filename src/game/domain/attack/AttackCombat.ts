import type { Battlefield } from '../battlefield/Battlefield';
import { GridPosition } from '../grid/GridPosition';
import type { DefenseStructure } from '../structures/DefenseStructure';
import type { TowerUpgradePolicy } from '../structures/TowerUpgradePolicy';
import {
  towerDamageMultiplier,
  unitDamageMultiplier,
  type TowerArchetype,
  type UnitArchetype,
} from '../combat/CombatArchetype';
import { AttackCommander } from './AttackCommander';
import { AttackUnit, type AttackUnitStats } from './AttackUnit';
import type { AttackUnitKind, SquadPlan, SquadSpawn } from './SquadPlan';

export type AttackCombatState = 'running' | 'won' | 'lost';
export type AttackFailureReason =
  | 'commander-defeated'
  | 'time-limit'
  | 'squad-defeated'
  | null;

interface TowerTarget {
  readonly distance: number;
  readonly column: number;
  readonly row: number;
  readonly archetype: UnitArchetype | null;
  readonly takeDamage: (amount: number) => void;
}

interface UnitPathStepCache {
  readonly fromPositionKey: string;
  readonly targetKey: string;
  readonly nextPosition: GridPosition;
}

export type FocusFireFailureReason =
  | 'combat-not-running'
  | 'cooldown'
  | 'invalid-target'
  | 'no-nearby-units';

export type FocusFireResult =
  | {
      readonly success: true;
      readonly targetTowerId: string;
      readonly unitCount: number;
    }
  | { readonly success: false; readonly reason: FocusFireFailureReason };

export type DisruptFailureReason =
  | 'combat-not-running'
  | 'cooldown'
  | 'invalid-target'
  | 'out-of-range';

export type DisruptResult =
  | { readonly success: true; readonly targetTowerId: string }
  | { readonly success: false; readonly reason: DisruptFailureReason };

export interface ActiveDisruption {
  readonly towerId: string;
  readonly remainingMs: number;
}

export interface AttackCombatConfig {
  readonly coreMaxHealth: number;
  readonly timeLimitMs: number;
  readonly towerUpgradePolicy: TowerUpgradePolicy;
  readonly unitStats: Readonly<Record<AttackUnitKind, AttackUnitStats>>;
  readonly towers: Readonly<Record<TowerArchetype, {
    readonly rangeInCells: number;
    readonly damage: number;
    readonly attackIntervalMs: number;
    readonly splashRadiusInCells: number;
  }>>;
  readonly commander: {
    readonly maxHealth: number;
    readonly attackDamage: number;
    readonly attackRange: number;
    readonly attackIntervalMs: number;
  };
  readonly focusFireCommandRadius: number;
  readonly focusFireCooldownMs: number;
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
  private currentFocusTargetId: string | null = null;
  private readonly focusedUnitIds = new Set<string>();
  private readonly unitPathStepCache = new Map<string, UnitPathStepCache>();

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

  public get focusTargetId(): string | null {
    return this.currentFocusTargetId;
  }

  public get focusedUnitCount(): number {
    return this.focusedUnitIds.size;
  }

  public get canIssueFocusFire(): boolean {
    return this.currentState === 'running' && this.commander.canFocusFire;
  }

  public get canIssueDisrupt(): boolean {
    return this.currentState === 'running' && this.commander.canDisrupt;
  }

  public get disruptCooldownRemainingMs(): number {
    return this.commander.disruptCooldownRemainingMs;
  }

  public get activeDisruptions(): readonly ActiveDisruption[] {
    return [...this.disabledTowerRemainingMs].map(([towerId, remainingMs]) => ({
      towerId,
      remainingMs,
    }));
  }

  public isUnitFocused(unitId: string): boolean {
    return this.focusedUnitIds.has(unitId);
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

  public issueFocusFire(towerId: string): FocusFireResult {
    if (this.currentState !== 'running') {
      return { success: false, reason: 'combat-not-running' };
    }
    if (!this.commander.canFocusFire) {
      return { success: false, reason: 'cooldown' };
    }

    const target = this.battlefield.structures.find(
      (structure) => structure.id === towerId && structure.kind === 'tower',
    );
    if (target === undefined) {
      return { success: false, reason: 'invalid-target' };
    }

    const unitsInCommandRadius = this.units.filter(
      (unit) =>
        this.distance(
          unit.renderColumn,
          unit.renderRow,
          this.commander.position.column,
          this.commander.position.row,
        ) <= this.config.focusFireCommandRadius,
    );
    if (unitsInCommandRadius.length === 0) {
      return { success: false, reason: 'no-nearby-units' };
    }
    if (!this.commander.consumeFocusFire(this.config.focusFireCooldownMs)) {
      return { success: false, reason: 'cooldown' };
    }

    this.clearFocusFireOrder();
    this.currentFocusTargetId = target.id;
    for (const unit of unitsInCommandRadius) {
      this.focusedUnitIds.add(unit.id);
      this.unitPathStepCache.delete(unit.id);
    }
    return {
      success: true,
      targetTowerId: target.id,
      unitCount: unitsInCommandRadius.length,
    };
  }

  public issueDisrupt(towerId: string): DisruptResult {
    if (this.currentState !== 'running') {
      return { success: false, reason: 'combat-not-running' };
    }
    if (!this.commander.canDisrupt) {
      return { success: false, reason: 'cooldown' };
    }

    const tower = this.battlefield.structures.find(
      (structure) => structure.id === towerId && structure.kind === 'tower',
    );
    if (tower === undefined) {
      return { success: false, reason: 'invalid-target' };
    }
    if (!this.isTowerWithinDisruptRange(tower.id)) {
      return { success: false, reason: 'out-of-range' };
    }
    if (!this.commander.consumeDisrupt(this.config.disruptCooldownMs)) {
      return { success: false, reason: 'cooldown' };
    }

    this.disabledTowerRemainingMs.set(tower.id, this.config.disruptDurationMs);
    return { success: true, targetTowerId: tower.id };
  }

  public isTowerDisabled(towerId: string): boolean {
    return (this.disabledTowerRemainingMs.get(towerId) ?? 0) > 0;
  }

  public isTowerWithinDisruptRange(towerId: string): boolean {
    const tower = this.battlefield.structures.find(
      (structure) => structure.id === towerId && structure.kind === 'tower',
    );
    return (
      tower !== undefined &&
      this.distanceBetweenPositions(
        tower.position,
        this.commander.position,
      ) <= this.config.disruptRange
    );
  }

  public disruptRemainingMs(towerId: string): number {
    return this.disabledTowerRemainingMs.get(towerId) ?? 0;
  }

  private simulateStep(deltaMs: number): void {
    this.elapsedMs += deltaMs;
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

    if (this.unitsById.size === 0 && this.remainingSpawnCount === 0) {
      this.currentState = 'lost';
      this.currentFailureReason = 'squad-defeated';
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
      const towerArchetype = tower.towerArchetype;
      if (towerArchetype === null) continue;
      const towerStats = this.config.towers[towerArchetype];
      if (this.isTowerDisabled(tower.id)) continue;
      const cooldown = Math.max(
        0,
        (this.towerCooldowns.get(tower.id) ?? 0) - deltaMs,
      );
      this.towerCooldowns.set(tower.id, cooldown);
      if (cooldown > 0) continue;

      const targets: TowerTarget[] = [
        ...this.units.map((unit) => ({
          distance: this.distance(
            tower.position.column,
            tower.position.row,
            unit.renderColumn,
            unit.renderRow,
          ),
          column: unit.renderColumn,
          row: unit.renderRow,
          archetype: unit.kind,
          takeDamage: (amount: number) => unit.takeDamage(amount),
        })),
        {
          distance: this.distanceBetweenPositions(
            tower.position,
            this.commander.position,
          ),
          column: this.commander.position.column,
          row: this.commander.position.row,
          archetype: null,
          takeDamage: (amount: number) => this.commander.takeDamage(amount),
        },
      ]
        .filter((target) => target.distance <= towerStats.rangeInCells)
        .sort((left, right) => left.distance - right.distance);
      const target = targets[0];
      if (target === undefined) continue;
      const affectedTargets =
        towerStats.splashRadiusInCells === 0
          ? [target]
          : targets.filter(
              (candidate) =>
                this.distance(
                  candidate.column,
                  candidate.row,
                  target.column,
                  target.row,
                ) <= towerStats.splashRadiusInCells,
            );
      for (const affected of affectedTargets) {
        const multiplier =
          affected.archetype === null
            ? 1
            : towerDamageMultiplier(towerArchetype, affected.archetype);
        affected.takeDamage(
          towerStats.damage *
            this.config.towerUpgradePolicy.damageMultiplier(tower) *
            multiplier,
        );
      }
      this.towerCooldowns.set(tower.id, towerStats.attackIntervalMs);
    }
  }

  private updateUnits(deltaMs: number): void {
    for (const unit of this.units) {
      unit.updateCooldown(deltaMs);
      if (this.updateFocusedUnit(unit, deltaMs)) {
        continue;
      }

      const target = this.nearestStructureInRange(
        unit.renderColumn,
        unit.renderRow,
        unit.stats.attackRange,
      );
      if (target !== null) {
        this.unitPathStepCache.delete(unit.id);
        unit.cancelMovement();
        if (unit.canAttack()) {
          target.takeDamage(
            unit.stats.attackDamage *
              unitDamageMultiplier(unit.kind, target.towerArchetype),
          );
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
        this.unitPathStepCache.delete(unit.id);
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

      const next = this.nextPathStep(
        unit,
        `core:${this.battlefield.map.corePosition.key}`,
        () => this.battlefield.findPathFrom(unit.position),
      );
      if (next !== undefined && next !== null) {
        unit.advanceToward(next, deltaMs);
      }
    }
  }

  private updateFocusedUnit(unit: AttackUnit, deltaMs: number): boolean {
    if (!this.focusedUnitIds.has(unit.id)) {
      return false;
    }

    const target = this.battlefield.structures.find(
      (structure) => structure.id === this.currentFocusTargetId,
    );
    if (target === undefined || target.kind !== 'tower' || target.health === 0) {
      this.clearFocusFireOrder();
      return false;
    }

    if (
      this.distance(
        unit.renderColumn,
        unit.renderRow,
        target.position.column,
        target.position.row,
      ) <= unit.stats.attackRange
    ) {
      this.unitPathStepCache.delete(unit.id);
      unit.cancelMovement();
      if (unit.canAttack()) {
        target.takeDamage(
          unit.stats.attackDamage *
            unitDamageMultiplier(unit.kind, target.towerArchetype),
        );
        unit.consumeAttack();
      }
      return true;
    }

    const next = this.nextPathStep(unit, `tower:${target.id}`, () =>
      this.battlefield.findPathToAdjacent(unit.position, target.position),
    );
    if (next === null) {
      this.focusedUnitIds.delete(unit.id);
      this.unitPathStepCache.delete(unit.id);
      if (this.focusedUnitIds.size === 0) {
        this.clearFocusFireOrder();
      }
      return false;
    }

    unit.advanceToward(next, deltaMs);
    return true;
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

  private nextPathStep(
    unit: AttackUnit,
    targetKey: string,
    createPath: () => readonly GridPosition[] | null,
  ): GridPosition | null {
    const cached = this.unitPathStepCache.get(unit.id);
    if (
      cached !== undefined &&
      cached.fromPositionKey === unit.position.key &&
      cached.targetKey === targetKey
    ) {
      return cached.nextPosition;
    }

    const nextPosition = createPath()?.[1] ?? null;
    if (nextPosition === null) {
      this.unitPathStepCache.delete(unit.id);
      return null;
    }
    this.unitPathStepCache.set(unit.id, {
      fromPositionKey: unit.position.key,
      targetKey,
      nextPosition,
    });
    return nextPosition;
  }

  private clearFocusFireOrder(): void {
    for (const unitId of this.focusedUnitIds) {
      this.unitPathStepCache.delete(unitId);
    }
    this.focusedUnitIds.clear();
    this.currentFocusTargetId = null;
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

  private updateDisabledTowers(deltaMs: number): void {
    for (const [towerId, remaining] of this.disabledTowerRemainingMs) {
      const nextRemaining = Math.max(0, remaining - deltaMs);
      if (nextRemaining === 0) this.disabledTowerRemainingMs.delete(towerId);
      else this.disabledTowerRemainingMs.set(towerId, nextRemaining);
    }
  }

  private removeDefeatedUnits(): void {
    for (const unit of this.units) {
      if (!unit.isAlive) {
        this.unitsById.delete(unit.id);
        this.focusedUnitIds.delete(unit.id);
        this.unitPathStepCache.delete(unit.id);
      }
    }
    if (this.focusedUnitIds.size === 0) this.currentFocusTargetId = null;
  }

  private removeDestroyedStructures(): void {
    let structureWasDestroyed = false;
    for (const structure of this.battlefield.structures) {
      if (structure.health === 0) {
        this.battlefield.destroy(structure.id);
        structureWasDestroyed = true;
        this.towerCooldowns.delete(structure.id);
        this.disabledTowerRemainingMs.delete(structure.id);
        if (structure.id === this.currentFocusTargetId) {
          this.clearFocusFireOrder();
        }
      }
    }
    if (structureWasDestroyed) this.unitPathStepCache.clear();
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
