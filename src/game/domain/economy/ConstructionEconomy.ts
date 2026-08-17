import type { TowerArchetype } from '../combat/CombatArchetype';
import type {
  DefenseStructure,
  StructureKind,
} from '../structures/DefenseStructure';

export interface ConstructionCostPolicy {
  costFor(
    kind: StructureKind,
    towerArchetype: TowerArchetype | null,
  ): number;
}

export interface ConstructionCostTable {
  readonly towers: Readonly<Record<TowerArchetype, number>>;
  readonly obstacle: number;
}

export class FixedConstructionCostPolicy implements ConstructionCostPolicy {
  public constructor(private readonly costs: ConstructionCostTable) {
    const allCosts = [...Object.values(costs.towers), costs.obstacle];
    if (allCosts.some((cost) => !Number.isInteger(cost) || cost <= 0)) {
      throw new Error('Construction costs must be positive integers.');
    }
  }

  public costFor(
    kind: StructureKind,
    towerArchetype: TowerArchetype | null,
  ): number {
    if (kind === 'obstacle') {
      return this.costs.obstacle;
    }
    if (towerArchetype === null) {
      throw new Error('A tower construction cost requires an archetype.');
    }
    return this.costs.towers[towerArchetype];
  }
}

export class ConstructionEconomy {
  private currentFunds: number;

  public constructor(
    initialFunds: number,
    private readonly costPolicy: ConstructionCostPolicy,
  ) {
    this.validateFunds(initialFunds);
    this.currentFunds = initialFunds;
  }

  public get funds(): number {
    return this.currentFunds;
  }

  public costFor(
    kind: StructureKind,
    towerArchetype: TowerArchetype | null,
  ): number {
    return this.costPolicy.costFor(kind, towerArchetype);
  }

  public costForStructure(structure: DefenseStructure): number {
    return this.costFor(structure.kind, structure.towerArchetype);
  }

  public canAfford(cost: number): boolean {
    this.validateFunds(cost);
    return this.currentFunds >= cost;
  }

  public spend(cost: number): boolean {
    if (!this.canAfford(cost)) {
      return false;
    }
    this.currentFunds -= cost;
    return true;
  }

  public grant(amount: number): void {
    this.validateFunds(amount);
    this.currentFunds += amount;
  }

  public refund(amount: number): void {
    this.grant(amount);
  }

  public restoreFunds(funds: number): void {
    this.validateFunds(funds);
    this.currentFunds = funds;
  }

  private validateFunds(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('Construction funds must be a non-negative integer.');
    }
  }
}
