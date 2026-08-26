import { describe, expect, it } from 'vitest';
import { Battlefield } from '../domain/battlefield/Battlefield';
import {
  ConstructionEconomy,
  FixedConstructionCostPolicy,
} from '../domain/economy/ConstructionEconomy';
import { GridMap } from '../domain/grid/GridMap';
import { GridPosition } from '../domain/grid/GridPosition';
import { BreadthFirstPathfinder } from '../domain/pathfinding/BreadthFirstPathfinder';
import { FixedTowerUpgradePolicy } from '../domain/structures/TowerUpgradePolicy';
import { DefenseEditor } from './DefenseEditor';

function createEditor(initialFunds = 15): DefenseEditor {
  const battlefield = new Battlefield(
    new GridMap(
      5,
      3,
      [new GridPosition(0, 1)],
      new GridPosition(4, 1),
    ),
    new BreadthFirstPathfinder(),
  );
  const economy = new ConstructionEconomy(
    initialFunds,
    new FixedConstructionCostPolicy({
      towers: { popgun: 3, mortar: 5, piercer: 6 },
      obstacle: 2,
    }),
  );
  return new DefenseEditor(
    battlefield,
    economy,
    new FixedTowerUpgradePolicy({
      maxLevel: 2,
      costs: { popgun: 2, mortar: 3, piercer: 4 },
      damageMultiplierPerLevel: 1.3,
      maxHealthMultiplierPerLevel: 1.2,
    }),
  );
}

describe('DefenseEditor construction transactions', () => {
  it('charges only for a successful placement', () => {
    const editor = createEditor(5);

    expect(editor.placeTower('popgun', new GridPosition(1, 0)).success).toBe(
      true,
    );
    expect(editor.constructionFunds).toBe(2);

    expect(editor.place('obstacle', new GridPosition(0, 1))).toEqual({
      success: false,
      reason: 'reserved-cell',
    });
    expect(editor.constructionFunds).toBe(2);
  });

  it('rejects a placement when construction funds are insufficient', () => {
    const editor = createEditor(4);

    expect(editor.placeTower('mortar', new GridPosition(1, 0))).toEqual({
      success: false,
      reason: 'insufficient-funds',
    });
    expect(editor.battlefield.structures).toHaveLength(0);
    expect(editor.constructionFunds).toBe(4);
  });

  it('refunds the full original cost when selling in preparation', () => {
    const editor = createEditor(8);
    const placed = editor.placeTower('mortar', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');

    const sale = editor.sell(placed.structure.id);

    expect(sale.success).toBe(true);
    if (!sale.success) throw new Error('Expected sale to succeed.');
    expect(sale.receipt.refund).toBe(5);
    expect(editor.constructionFunds).toBe(8);
  });

  it('moves an existing structure without charging funds', () => {
    const editor = createEditor(8);
    const placed = editor.placeTower('popgun', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');

    editor.move(placed.structure.id, new GridPosition(1, 2));

    expect(editor.constructionFunds).toBe(5);
  });

  it('undoes and redoes placement, movement, sale, and upgrade transactions', () => {
    const editor = createEditor(10);
    const placed = editor.placeTower('popgun', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');
    editor.move(placed.structure.id, new GridPosition(1, 2));
    editor.upgradeTower(placed.structure.id);
    editor.sell(placed.structure.id);

    expect(editor.battlefield.structures).toHaveLength(0);
    expect(editor.constructionFunds).toBe(10);
    expect(editor.undo()).toBe(true);
    expect(editor.battlefield.structures[0]?.upgradeLevel).toBe(2);
    expect(editor.undo()).toBe(true);
    expect(editor.battlefield.structures[0]?.upgradeLevel).toBe(1);
    expect(editor.undo()).toBe(true);
    expect(editor.battlefield.structures[0]?.position).toEqual(
      new GridPosition(1, 0),
    );
    expect(editor.undo()).toBe(true);
    expect(editor.battlefield.structures).toHaveLength(0);
    expect(editor.constructionFunds).toBe(10);
    expect(editor.redo()).toBe(true);
    expect(editor.battlefield.structures).toHaveLength(1);
  });

  it('restores saved funds with the blueprint to prevent refund duplication', () => {
    const editor = createEditor(10);
    const placed = editor.placeTower('popgun', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');
    editor.saveBlueprint();
    editor.sell(placed.structure.id);
    expect(editor.constructionFunds).toBe(10);

    expect(editor.restoreBlueprint()).toBe(true);

    expect(editor.constructionFunds).toBe(7);
    expect(editor.battlefield.structures).toHaveLength(1);
  });

  it('adds the configured round reward without replacing carried funds', () => {
    const editor = createEditor(4);

    editor.grantConstructionFunds(4);

    expect(editor.constructionFunds).toBe(8);
  });

  it('charges for a tower upgrade and increases its level and maximum health', () => {
    const editor = createEditor(8);
    const placed = editor.placeTower('popgun', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');

    const upgrade = editor.upgradeTower(placed.structure.id);

    expect(upgrade.success).toBe(true);
    expect(placed.structure.upgradeLevel).toBe(2);
    expect(placed.structure.maxHealth).toBe(120);
    expect(editor.constructionFunds).toBe(3);
    expect(editor.upgradeTower(placed.structure.id)).toEqual({
      success: false,
      reason: 'max-level',
    });
  });

  it('refunds base construction and upgrade investment when selling', () => {
    const editor = createEditor(8);
    const placed = editor.placeTower('popgun', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');
    editor.upgradeTower(placed.structure.id);

    const sale = editor.sell(placed.structure.id);

    expect(sale.success).toBe(true);
    if (!sale.success) throw new Error('Expected sale to succeed.');
    expect(sale.receipt.refund).toBe(5);
    expect(editor.constructionFunds).toBe(8);
  });

  it('preserves an upgraded tower and funds in a saved blueprint', () => {
    const editor = createEditor(10);
    const placed = editor.placeTower('popgun', new GridPosition(1, 0));
    if (!placed.success) throw new Error('Expected placement to succeed.');
    editor.upgradeTower(placed.structure.id);
    editor.saveBlueprint();
    editor.sell(placed.structure.id);

    editor.restoreBlueprint();

    const restored = editor.battlefield.structures[0];
    expect(restored?.upgradeLevel).toBe(2);
    expect(restored?.maxHealth).toBe(120);
    expect(editor.constructionFunds).toBe(5);
  });

  it('rejects obstacle upgrades and upgrades without enough funds', () => {
    const editor = createEditor(6);
    const obstacle = editor.place('obstacle', new GridPosition(1, 0));
    if (!obstacle.success) throw new Error('Expected placement to succeed.');

    expect(editor.upgradeTower(obstacle.structure.id)).toEqual({
      success: false,
      reason: 'not-upgradable',
    });
    const tower = editor.placeTower('popgun', new GridPosition(1, 2));
    if (!tower.success) throw new Error('Expected placement to succeed.');
    expect(editor.upgradeTower(tower.structure.id)).toEqual({
      success: false,
      reason: 'insufficient-funds',
    });
  });

  it('restores a campaign design, funds, upgrades, and a collision-free id', () => {
    const original = createEditor(12);
    const tower = original.placeTower('popgun', new GridPosition(1, 0));
    if (!tower.success) throw new Error('Expected placement to succeed.');
    original.upgradeTower(tower.structure.id);
    const wall = original.place('obstacle', new GridPosition(2, 2));
    if (!wall.success) throw new Error('Expected placement to succeed.');
    const snapshot = original.captureCampaignState();

    const restored = createEditor(30);
    restored.restoreCampaignState({
      blueprint: snapshot.blueprint.snapshot,
      constructionFunds: snapshot.constructionFunds,
    });
    const next = restored.placeTower('popgun', new GridPosition(3, 0));

    expect(restored.constructionFunds).toBe(snapshot.constructionFunds - 3);
    expect(restored.battlefield.structures).toHaveLength(3);
    expect(restored.battlefield.structures[0]?.upgradeLevel).toBe(2);
    expect(next.success && next.structure.id).toBe('structure-3');
  });
});
