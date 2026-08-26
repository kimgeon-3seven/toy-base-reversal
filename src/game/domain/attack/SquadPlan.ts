import type { UnitArchetype } from '../combat/CombatArchetype';
import { unitCost } from '../combat/UnitEconomy';

export type AttackUnitKind = UnitArchetype;

export interface SquadPlanSnapshot {
  readonly totalBudget: number;
  readonly simultaneousCapacityPerLane: number;
  readonly spawnIntervalMs: number;
  readonly lanes: readonly (readonly AttackUnitKind[])[];
}

export class SquadPlan {
  private readonly laneQueues: AttackUnitKind[][];
  private spentBudget = 0;

  public constructor(
    public readonly totalBudget: number,
    public readonly simultaneousCapacityPerLane: number,
    laneCount = 3,
    public readonly spawnIntervalMs = 900,
  ) {
    if (
      totalBudget <= 0 ||
      simultaneousCapacityPerLane <= 0 ||
      laneCount <= 0 ||
      spawnIntervalMs <= 0
    ) {
      throw new Error('Squad plan values must be positive.');
    }
    this.laneQueues = Array.from({ length: laneCount }, () => []);
  }

  public static restore(snapshot: SquadPlanSnapshot): SquadPlan {
    if (!Array.isArray(snapshot.lanes) || snapshot.lanes.length === 0) {
      throw new Error('A saved squad requires at least one lane.');
    }
    const plan = new SquadPlan(
      snapshot.totalBudget,
      snapshot.simultaneousCapacityPerLane,
      snapshot.lanes.length,
      snapshot.spawnIntervalMs,
    );
    for (const [laneIndex, lane] of snapshot.lanes.entries()) {
      if (!Array.isArray(lane)) {
        throw new Error('Saved squad lane is invalid.');
      }
      for (const kind of lane) {
        if (
          (kind !== 'tank' && kind !== 'swarm' && kind !== 'ranger') ||
          !plan.addUnit(laneIndex, kind)
        ) {
          throw new Error('Saved squad contains an invalid unit plan.');
        }
      }
    }
    return plan;
  }

  public get remainingBudget(): number {
    return this.totalBudget - this.spentBudget;
  }

  public get totalSortiePoints(): number {
    return this.totalBudget;
  }

  public get remainingSortiePoints(): number {
    return this.remainingBudget;
  }

  public get unitCount(): number {
    return this.laneQueues.reduce((total, lane) => total + lane.length, 0);
  }

  public get commanderLane(): number {
    return Math.min(1, this.laneQueues.length - 1);
  }

  public get lanes(): readonly (readonly AttackUnitKind[])[] {
    return this.laneQueues;
  }

  public get snapshot(): SquadPlanSnapshot {
    return {
      totalBudget: this.totalBudget,
      simultaneousCapacityPerLane: this.simultaneousCapacityPerLane,
      spawnIntervalMs: this.spawnIntervalMs,
      lanes: this.laneQueues.map((lane) => [...lane]),
    };
  }

  public addUnit(laneIndex: number, kind: AttackUnitKind): boolean {
    const lane = this.laneQueues[laneIndex];
    const cost = unitCost(kind);
    if (lane === undefined || cost > this.remainingBudget) {
      return false;
    }

    lane.push(kind);
    this.spentBudget += cost;
    return true;
  }

  public removeLastUnit(laneIndex: number): AttackUnitKind | null {
    const lane = this.laneQueues[laneIndex];
    const removed = lane?.pop();
    if (removed === undefined) {
      return null;
    }

    this.spentBudget -= unitCost(removed);
    return removed;
  }

  public clearUnits(): number {
    const refundedPoints = this.spentBudget;
    for (const lane of this.laneQueues) lane.splice(0, lane.length);
    this.spentBudget = 0;
    return refundedPoints;
  }

  public buildSpawnSchedule(
    intervalMs = this.spawnIntervalMs,
  ): readonly SquadSpawn[] {
    return this.laneQueues
      .flatMap((lane, laneIndex) =>
        lane.map((kind, queueIndex) => ({
          laneIndex,
          kind,
          delayMs:
            Math.floor(queueIndex / this.simultaneousCapacityPerLane) *
              intervalMs +
            (queueIndex % this.simultaneousCapacityPerLane) * 120,
          queueIndex,
        })),
      )
      .sort(
        (left, right) =>
          left.delayMs - right.delayMs || left.laneIndex - right.laneIndex,
      );
  }
}

export interface SquadSpawn {
  readonly laneIndex: number;
  readonly kind: AttackUnitKind;
  readonly delayMs: number;
  readonly queueIndex: number;
}

export function attackUnitCost(kind: AttackUnitKind): number {
  return unitCost(kind);
}
