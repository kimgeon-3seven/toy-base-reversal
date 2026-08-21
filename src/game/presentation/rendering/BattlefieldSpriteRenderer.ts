import Phaser from 'phaser';
import type { AttackCommander } from '../../domain/attack/AttackCommander';
import type { AttackUnit } from '../../domain/attack/AttackUnit';
import type { DefenseEnemy } from '../../domain/combat/DefenseEnemy';
import type { DefenseStructure } from '../../domain/structures/DefenseStructure';
import {
  GRID_CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
} from '../../config/BattlefieldConfig';
import { IMAGE_ASSETS } from '../assets/GameAssets';

interface SpriteDescriptor {
  readonly id: string;
  readonly texture: string;
  readonly x: number;
  readonly y: number;
  readonly displaySize: number;
  readonly depth: number;
}

export class BattlefieldSpriteRenderer {
  private readonly structures = new Map<string, Phaser.GameObjects.Image>();
  private readonly defenders = new Map<string, Phaser.GameObjects.Image>();
  private readonly attackers = new Map<string, Phaser.GameObjects.Image>();
  private commander: Phaser.GameObjects.Image | null = null;
  private readonly core: Phaser.GameObjects.Image;

  public constructor(private readonly scene: Phaser.Scene) {
    this.core = scene.add.image(0, 0, IMAGE_ASSETS.core).setDepth(9);
  }

  public renderCore(column: number, row: number, healthRatio: number): void {
    const point = this.toWorld(column, row);
    this.core
      .setPosition(point.x, point.y)
      .setDisplaySize(58, 58)
      .setTint(healthRatio > 0.4 ? 0xffffff : 0xff8a8a)
      .setAlpha(healthRatio > 0 ? 1 : 0.35)
      .setVisible(true);
  }

  public renderStructures(structures: readonly DefenseStructure[]): void {
    const descriptors = structures.map((structure): SpriteDescriptor => {
      const point = this.toWorld(structure.position.column, structure.position.row);
      return {
        id: structure.id,
        texture: this.structureTexture(structure),
        x: point.x,
        y: point.y,
        displaySize: structure.kind === 'obstacle' ? 53 : 58,
        depth: 12,
      };
    });
    this.sync(this.structures, descriptors);
  }

  public renderDefenders(enemies: readonly DefenseEnemy[]): void {
    const descriptors = enemies.map((enemy): SpriteDescriptor => {
      const point = this.toWorld(enemy.renderColumn, enemy.renderRow);
      return {
        id: enemy.id,
        texture:
          enemy.stats.archetype === 'tank'
            ? IMAGE_ASSETS.defenderTank
            : enemy.stats.archetype === 'swarm'
              ? IMAGE_ASSETS.defenderSwarm
              : IMAGE_ASSETS.defenderRanger,
        x: point.x,
        y: point.y,
        displaySize: enemy.stats.archetype === 'tank' ? 60 : 54,
        depth: 15,
      };
    });
    this.sync(this.defenders, descriptors);
  }

  public renderAttackers(units: readonly AttackUnit[]): void {
    const descriptors = units.map((unit): SpriteDescriptor => {
      const point = this.toWorld(unit.renderColumn, unit.renderRow);
      return {
        id: unit.id,
        texture:
          unit.kind === 'tank'
            ? IMAGE_ASSETS.attackerTank
            : unit.kind === 'swarm'
              ? IMAGE_ASSETS.attackerSwarm
              : IMAGE_ASSETS.attackerRanger,
        x: point.x,
        y: point.y,
        displaySize: unit.kind === 'tank' ? 60 : 54,
        depth: 16,
      };
    });
    this.sync(this.attackers, descriptors);
  }

  public renderCommander(commander: AttackCommander | null): void {
    if (commander === null) {
      this.commander?.destroy();
      this.commander = null;
      return;
    }

    const point = this.toWorld(commander.position.column, commander.position.row);
    if (this.commander === null) {
      this.commander = this.scene.add
        .image(point.x, point.y, IMAGE_ASSETS.commander)
        .setDepth(17);
    }
    this.commander
      .setPosition(point.x, point.y)
      .setDisplaySize(64, 64)
      .setAlpha(commander.isAlive ? 1 : 0.35);
  }

  public clearCombatants(): void {
    this.sync(this.defenders, []);
    this.sync(this.attackers, []);
    this.renderCommander(null);
  }

  private sync(
    sprites: Map<string, Phaser.GameObjects.Image>,
    descriptors: readonly SpriteDescriptor[],
  ): void {
    const liveIds = new Set(descriptors.map((descriptor) => descriptor.id));
    for (const [id, sprite] of sprites) {
      if (liveIds.has(id)) continue;
      sprite.destroy();
      sprites.delete(id);
    }

    for (const descriptor of descriptors) {
      let sprite = sprites.get(descriptor.id);
      if (sprite === undefined) {
        sprite = this.scene.add
          .image(descriptor.x, descriptor.y, descriptor.texture)
          .setDepth(descriptor.depth);
        sprites.set(descriptor.id, sprite);
      }
      sprite
        .setTexture(descriptor.texture)
        .setPosition(descriptor.x, descriptor.y)
        .setDisplaySize(descriptor.displaySize, descriptor.displaySize)
        .setVisible(true);
    }
  }

  private structureTexture(structure: DefenseStructure): string {
    if (structure.kind === 'obstacle') return IMAGE_ASSETS.obstacle;
    if (structure.towerArchetype === 'mortar') return IMAGE_ASSETS.towerMortar;
    if (structure.towerArchetype === 'piercer') return IMAGE_ASSETS.towerPiercer;
    return IMAGE_ASSETS.towerPopgun;
  }

  private toWorld(column: number, row: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }
}
