import type { Battlefield } from '../domain/battlefield/Battlefield';
import type { BattlefieldResult } from '../domain/battlefield/BattlefieldResult';
import type { DefenseBlueprint } from '../domain/battlefield/DefenseBlueprint';
import type { ConstructionEconomy } from '../domain/economy/ConstructionEconomy';
import type { GridPosition } from '../domain/grid/GridPosition';
import type { TowerArchetype } from '../domain/combat/CombatArchetype';
import type { TowerUpgradePolicy } from '../domain/structures/TowerUpgradePolicy';
import {
  DefenseStructure,
  type StructureKind,
} from '../domain/structures/DefenseStructure';
import type {
  DefenseEditResult,
  DefenseSaleResult,
  DefenseUpgradeResult,
} from './DefenseEditResult';

const STRUCTURE_HEALTH: Readonly<Record<StructureKind, number>> = {
  tower: 100,
  obstacle: 180,
};

const TOWER_HEALTH: Readonly<Record<TowerArchetype, number>> = {
  popgun: 100,
  mortar: 115,
  piercer: 105,
};

export class DefenseEditor {
  private nextStructureSequence = 1;
  private savedBlueprint: DefenseBlueprint | null = null;
  private savedConstructionFunds: number | null = null;

  public constructor(
    public readonly battlefield: Battlefield,
    private readonly economy: ConstructionEconomy,
    private readonly upgradePolicy: TowerUpgradePolicy,
  ) {}

  public get constructionFunds(): number {
    return this.economy.funds;
  }

  public constructionCost(
    kind: StructureKind,
    towerArchetype: TowerArchetype | null,
  ): number {
    return this.economy.costFor(kind, towerArchetype);
  }

  public upgradeCost(structure: DefenseStructure): number | null {
    return this.upgradePolicy.nextUpgradeCost(structure);
  }

  public saleRefund(structure: DefenseStructure): number {
    return (
      this.economy.costForStructure(structure) +
      this.upgradePolicy.totalUpgradeInvestment(structure)
    );
  }

  public place(
    kind: StructureKind,
    position: GridPosition,
    towerArchetype: TowerArchetype | null =
      kind === 'tower' ? 'popgun' : null,
  ): DefenseEditResult {
    const constructionCost = this.economy.costFor(kind, towerArchetype);
    if (!this.economy.canAfford(constructionCost)) {
      return { success: false, reason: 'insufficient-funds' };
    }

    const maxHealth =
      kind === 'tower' && towerArchetype !== null
        ? TOWER_HEALTH[towerArchetype]
        : STRUCTURE_HEALTH[kind];
    const structure = new DefenseStructure(
      `structure-${this.nextStructureSequence}`,
      kind,
      position,
      maxHealth,
      towerArchetype,
    );

    const result = this.battlefield.place(structure);
    if (result.success) {
      this.economy.spend(constructionCost);
      this.nextStructureSequence += 1;
    }

    return result;
  }

  public placeTower(
    towerArchetype: TowerArchetype,
    position: GridPosition,
  ): DefenseEditResult {
    return this.place('tower', position, towerArchetype);
  }

  public move(structureId: string, position: GridPosition): BattlefieldResult {
    return this.battlefield.move(structureId, position);
  }

  public sell(structureId: string): DefenseSaleResult {
    const result = this.battlefield.sell(structureId);
    if (!result.success) {
      return result;
    }

    const refund = this.saleRefund(result.structure);
    this.economy.refund(refund);
    return {
      success: true,
      receipt: { structure: result.structure, refund },
    };
  }

  public destroy(structureId: string): BattlefieldResult {
    return this.battlefield.destroy(structureId);
  }

  public upgradeTower(structureId: string): DefenseUpgradeResult {
    const structure = this.battlefield.structures.find(
      (candidate) => candidate.id === structureId,
    );
    if (structure === undefined) {
      return { success: false, reason: 'structure-not-found' };
    }
    if (structure.kind !== 'tower') {
      return { success: false, reason: 'not-upgradable' };
    }

    const cost = this.upgradePolicy.nextUpgradeCost(structure);
    if (cost === null) {
      return { success: false, reason: 'max-level' };
    }
    if (!this.economy.canAfford(cost)) {
      return { success: false, reason: 'insufficient-funds' };
    }

    structure.upgradeToNextLevel(
      this.upgradePolicy.maxHealthMultiplierForNextLevel(structure),
    );
    this.economy.spend(cost);
    return {
      success: true,
      receipt: { structure, cost, level: structure.upgradeLevel },
    };
  }

  public saveBlueprint(): void {
    this.savedBlueprint = this.battlefield.captureBlueprint();
    this.savedConstructionFunds = this.economy.funds;
  }

  public restoreBlueprint(): boolean {
    if (
      this.savedBlueprint === null ||
      this.savedConstructionFunds === null
    ) {
      return false;
    }

    this.battlefield.restoreBlueprint(this.savedBlueprint);
    this.economy.restoreFunds(this.savedConstructionFunds);
    return true;
  }

  public grantConstructionFunds(amount: number): void {
    this.economy.grant(amount);
  }
}
