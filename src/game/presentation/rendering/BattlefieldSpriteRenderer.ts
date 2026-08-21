import Phaser from 'phaser';
import type { AttackCommander } from '../../domain/attack/AttackCommander';
import type { AttackUnit } from '../../domain/attack/AttackUnit';
import type {
  CombatEvent,
  CombatPoint,
} from '../../domain/combat/CombatEvent';
import type { DefenseEnemy } from '../../domain/combat/DefenseEnemy';
import type { DefenseStructure } from '../../domain/structures/DefenseStructure';
import {
  GRID_CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
} from '../../config/BattlefieldConfig';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import {
  BattlefieldSpriteView,
  type BattlefieldSpriteState,
} from './BattlefieldSpriteView';
import { FacingDirectionResolver } from './FacingDirectionResolver';
import { SpriteFacingProfile } from './SpriteFacingProfile';

interface SpriteDescriptor extends BattlefieldSpriteState {
  readonly id: string;
}

export class BattlefieldSpriteRenderer {
  private readonly facingResolver = new FacingDirectionResolver();
  private readonly facingProfile = new SpriteFacingProfile();
  private readonly structures = new Map<string, BattlefieldSpriteView>();
  private readonly defenders = new Map<string, BattlefieldSpriteView>();
  private readonly attackers = new Map<string, BattlefieldSpriteView>();
  private commander: BattlefieldSpriteView | null = null;
  private readonly core: BattlefieldSpriteView;

  public constructor(private readonly scene: Phaser.Scene) {
    this.core = new BattlefieldSpriteView(
      scene,
      this.facingResolver,
      'core',
      this.coreState(0, 0, 1),
    );
  }

  public renderCore(column: number, row: number, healthRatio: number): void {
    this.core.sync(this.coreState(column, row, healthRatio));
  }

  public renderStructures(
    structures: readonly DefenseStructure[],
    disabledTowerIds: ReadonlySet<string> = new Set<string>(),
  ): void {
    const descriptors = structures.map((structure): SpriteDescriptor => {
      const point = this.toWorld(structure.position.column, structure.position.row);
      const texture = this.structureTexture(structure);
      return {
        id: structure.id,
        texture,
        x: point.x,
        y: point.y,
        displaySize: structure.kind === 'obstacle' ? 53 : 58,
        depth: 12,
        naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(texture),
        initialFacingDegrees: 0,
        facingMode: structure.kind === 'tower' ? 'free' : 'static',
        enableMovementBob: false,
        isDisrupted: disabledTowerIds.has(structure.id),
      };
    });
    this.sync(this.structures, descriptors);
  }

  public renderDefenders(enemies: readonly DefenseEnemy[]): void {
    const descriptors = enemies.map((enemy): SpriteDescriptor => {
      const point = this.toWorld(enemy.renderColumn, enemy.renderRow);
      const texture =
        enemy.stats.archetype === 'tank'
          ? IMAGE_ASSETS.defenderTank
          : enemy.stats.archetype === 'swarm'
            ? IMAGE_ASSETS.defenderSwarm
            : IMAGE_ASSETS.defenderRanger;
      return {
        id: enemy.id,
        texture,
        x: point.x,
        y: point.y,
        displaySize: enemy.stats.archetype === 'tank' ? 60 : 54,
        depth: 15,
        naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(texture),
        initialFacingDegrees: 0,
        facingMode: 'eight-way',
        enableMovementBob: true,
      };
    });
    this.sync(this.defenders, descriptors);
  }

  public renderAttackers(units: readonly AttackUnit[]): void {
    const descriptors = units.map((unit): SpriteDescriptor => {
      const point = this.toWorld(unit.renderColumn, unit.renderRow);
      const texture =
        unit.kind === 'tank'
          ? IMAGE_ASSETS.attackerTank
          : unit.kind === 'swarm'
            ? IMAGE_ASSETS.attackerSwarm
            : IMAGE_ASSETS.attackerRanger;
      return {
        id: unit.id,
        texture,
        x: point.x,
        y: point.y,
        displaySize: unit.kind === 'tank' ? 60 : 54,
        depth: 16,
        naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(texture),
        initialFacingDegrees: 0,
        facingMode: 'eight-way',
        enableMovementBob: true,
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
    const state: BattlefieldSpriteState = {
      texture: IMAGE_ASSETS.commander,
      x: point.x,
      y: point.y,
      displaySize: 64,
      depth: 17,
      naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(
        IMAGE_ASSETS.commander,
      ),
      initialFacingDegrees: 0,
      facingMode: 'eight-way',
      enableMovementBob: true,
      alpha: commander.isAlive ? 1 : 0.35,
    };
    if (this.commander === null) {
      this.commander = new BattlefieldSpriteView(
        this.scene,
        this.facingResolver,
        'commander',
        state,
      );
    } else {
      this.commander.sync(state);
    }
  }

  public present(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (event.type !== 'attack') continue;
      const source = this.attackSourceFor(event);
      const targetPoint = this.toWorld(event.target.column, event.target.row);
      source?.playAttackToward(targetPoint.x, targetPoint.y);
      this.nearestSpriteTo(event.target, this.allSprites())?.flashHit();
    }
  }

  public clearCombatants(): void {
    this.sync(this.defenders, []);
    this.sync(this.attackers, []);
    this.renderCommander(null);
  }

  private sync(
    sprites: Map<string, BattlefieldSpriteView>,
    descriptors: readonly SpriteDescriptor[],
  ): void {
    const liveIds = new Set(descriptors.map((descriptor) => descriptor.id));
    for (const [id, sprite] of sprites) {
      if (liveIds.has(id)) continue;
      sprite.destroy();
      sprites.delete(id);
    }

    for (const descriptor of descriptors) {
      const existing = sprites.get(descriptor.id);
      if (existing === undefined) {
        sprites.set(
          descriptor.id,
          new BattlefieldSpriteView(
            this.scene,
            this.facingResolver,
            descriptor.id,
            descriptor,
          ),
        );
      } else {
        existing.sync(descriptor);
      }
    }
  }

  private attackSourceFor(
    event: Extract<CombatEvent, { readonly type: 'attack' }>,
  ): BattlefieldSpriteView | null {
    if (
      event.style === 'popgun' ||
      event.style === 'mortar' ||
      event.style === 'piercer'
    ) {
      return this.nearestSpriteTo(event.source, this.structures.values());
    }
    if (event.style === 'commander') return this.commander;
    return this.nearestSpriteTo(event.source, [
      ...this.defenders.values(),
      ...this.attackers.values(),
    ]);
  }

  private nearestSpriteTo(
    point: CombatPoint,
    sprites: Iterable<BattlefieldSpriteView>,
  ): BattlefieldSpriteView | null {
    const world = this.toWorld(point.column, point.row);
    let nearest: BattlefieldSpriteView | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const sprite of sprites) {
      const distance = sprite.distanceSquaredTo(world.x, world.y);
      if (distance < nearestDistance) {
        nearest = sprite;
        nearestDistance = distance;
      }
    }
    return nearestDistance <= GRID_CELL_SIZE ** 2 ? nearest : null;
  }

  private allSprites(): readonly BattlefieldSpriteView[] {
    return [
      this.core,
      ...this.structures.values(),
      ...this.defenders.values(),
      ...this.attackers.values(),
      ...(this.commander === null ? [] : [this.commander]),
    ];
  }

  private coreState(
    column: number,
    row: number,
    healthRatio: number,
  ): BattlefieldSpriteState {
    const point = this.toWorld(column, row);
    return {
      texture: IMAGE_ASSETS.core,
      x: point.x,
      y: point.y,
      displaySize: 58,
      depth: 9,
      naturalFacingDegrees: 0,
      initialFacingDegrees: 0,
      facingMode: 'static',
      enableMovementBob: false,
      tint: healthRatio > 0.4 ? 0xffffff : 0xff8a8a,
      alpha: healthRatio > 0 ? 1 : 0.35,
    };
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
