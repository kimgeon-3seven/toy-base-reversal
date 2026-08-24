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
  DefenseEditFailureReason,
  DefenseEditResult,
  DefenseSaleResult,
  DefenseUpgradeResult,
} from './DefenseEditResult';
import { DefenseEditHistory, type DefenseEditSnapshot } from './DefenseEditHistory';

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
  private readonly editHistory = new DefenseEditHistory();

  public constructor(
    public readonly battlefield: Battlefield,
    private readonly economy: ConstructionEconomy,
    private readonly upgradePolicy: TowerUpgradePolicy,
  ) {}

  public get constructionFunds(): number {
    return this.economy.funds;
  }

  public get canUndo(): boolean {
    return this.editHistory.canUndo;
  }

  public get canRedo(): boolean {
    return this.editHistory.canRedo;
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

  public previewPlacement(
    kind: StructureKind,
    position: GridPosition,
    towerArchetype: TowerArchetype | null,
    movingStructureId: string | null = null,
  ): DefenseEditFailureReason | null {
    if (movingStructureId === null) {
      const constructionCost = this.economy.costFor(kind, towerArchetype);
      if (!this.economy.canAfford(constructionCost)) {
        return 'insufficient-funds';
      }
    }
    return this.battlefield.previewPlacement(position, movingStructureId);
  }

  public place(
    kind: StructureKind,
    position: GridPosition,
    towerArchetype: TowerArchetype | null =
      kind === 'tower' ? 'popgun' : null,
  ): DefenseEditResult {
    const previous = this.captureEditSnapshot();
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
      this.editHistory.record(previous);
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
    const previous = this.captureEditSnapshot();
    const result = this.battlefield.move(structureId, position);
    if (result.success) this.editHistory.record(previous);
    return result;
  }

  public sell(structureId: string): DefenseSaleResult {
    const previous = this.captureEditSnapshot();
    const result = this.battlefield.sell(structureId);
    if (!result.success) {
      return result;
    }

    this.editHistory.record(previous);
    const refund = this.saleRefund(result.structure);
    this.economy.refund(refund);
    return {
      success: true,
      receipt: { structure: result.structure, refund },
    };
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

    const previous = this.captureEditSnapshot();
    structure.upgradeToNextLevel(
      this.upgradePolicy.maxHealthMultiplierForNextLevel(structure),
    );
    this.economy.spend(cost);
    this.editHistory.record(previous);
    return {
      success: true,
      receipt: { structure, cost, level: structure.upgradeLevel },
    };
  }

  public saveBlueprint(): void {
    this.savedBlueprint = this.battlefield.captureBlueprint();
    this.savedConstructionFunds = this.economy.funds;
    this.editHistory.clear();
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
    this.editHistory.clear();
    return true;
  }

  public undo(): boolean {
    const previous = this.editHistory.undo(this.captureEditSnapshot());
    if (previous === null) return false;
    this.restoreEditSnapshot(previous);
    return true;
  }

  public redo(): boolean {
    const next = this.editHistory.redo(this.captureEditSnapshot());
    if (next === null) return false;
    this.restoreEditSnapshot(next);
    return true;
  }

  public grantConstructionFunds(amount: number): void {
    this.economy.grant(amount);
  }

  private captureEditSnapshot(): DefenseEditSnapshot {
    return {
      blueprint: this.battlefield.captureBlueprint(),
      constructionFunds: this.economy.funds,
    };
  }

  private restoreEditSnapshot(snapshot: DefenseEditSnapshot): void {
    this.battlefield.restoreBlueprint(snapshot.blueprint);
    this.economy.restoreFunds(snapshot.constructionFunds);
  }
}
