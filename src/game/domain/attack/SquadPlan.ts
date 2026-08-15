export type AttackUnitKind = 'tank' | 'ranger';

const UNIT_COSTS: Readonly<Record<AttackUnitKind, number>> = {
  tank: 4,
  ranger: 3,
};

export class SquadPlan {
  private readonly laneQueues: AttackUnitKind[][];
  private spentBudget = 0;
  private currentCommanderLane: number;

  public constructor(
    public readonly totalBudget: number,
    public readonly simultaneousCapacityPerLane: number,
    laneCount = 3,
  ) {
    if (totalBudget <= 0 || simultaneousCapacityPerLane <= 0 || laneCount <= 0) {
      throw new Error('Squad plan values must be positive.');
    }
    this.laneQueues = Array.from({ length: laneCount }, () => []);
    this.currentCommanderLane = Math.min(1, laneCount - 1);
  }

  public get remainingBudget(): number {
    return this.totalBudget - this.spentBudget;
  }

  public get commanderLane(): number {
    return this.currentCommanderLane;
  }

  public get lanes(): readonly (readonly AttackUnitKind[])[] {
    return this.laneQueues;
  }

  public addUnit(laneIndex: number, kind: AttackUnitKind): boolean {
    const lane = this.laneQueues[laneIndex];
    const cost = UNIT_COSTS[kind];
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

    this.spentBudget -= UNIT_COSTS[removed];
    return removed;
  }

  public setCommanderLane(laneIndex: number): boolean {
    if (this.laneQueues[laneIndex] === undefined) {
      return false;
    }
    this.currentCommanderLane = laneIndex;
    return true;
  }

  public buildSpawnSchedule(intervalMs = 900): readonly SquadSpawn[] {
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
  return UNIT_COSTS[kind];
}
