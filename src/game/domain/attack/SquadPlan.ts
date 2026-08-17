import type { UnitArchetype } from '../combat/CombatArchetype';
import { unitCost } from '../combat/UnitEconomy';

export type AttackUnitKind = UnitArchetype;

export class SquadPlan {
  private readonly laneQueues: AttackUnitKind[][];
  private spentBudget = 0;
  private currentCommanderLane: number;

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
    this.currentCommanderLane = Math.min(1, laneCount - 1);
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
    return this.currentCommanderLane;
  }

  public get lanes(): readonly (readonly AttackUnitKind[])[] {
    return this.laneQueues;
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

  public setCommanderLane(laneIndex: number): boolean {
    if (this.laneQueues[laneIndex] === undefined) {
      return false;
    }
    this.currentCommanderLane = laneIndex;
    return true;
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
