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
import { DirectionalAnimationCatalog } from './DirectionalAnimationCatalog';
import { SpriteFacingProfile } from './SpriteFacingProfile';
import {
  ObstacleVisualPolicy,
  type ObstacleVisualState,
} from './ObstacleVisualPolicy';

interface SpriteDescriptor extends BattlefieldSpriteState {
  readonly id: string;
}

export class BattlefieldSpriteRenderer {
  private readonly facingResolver = new FacingDirectionResolver();
  private readonly animationCatalog = new DirectionalAnimationCatalog();
  private readonly facingProfile = new SpriteFacingProfile();
  private readonly obstacleVisualPolicy = new ObstacleVisualPolicy();
  private readonly structures = new Map<string, BattlefieldSpriteView>();
  private readonly defenders = new Map<string, BattlefieldSpriteView>();
  private readonly attackers = new Map<string, BattlefieldSpriteView>();
  private commander: BattlefieldSpriteView | null = null;
  private readonly core: BattlefieldSpriteView;
  private readonly coreHud: Phaser.GameObjects.Graphics;
  private readonly coreLabel: Phaser.GameObjects.Text;
  private readonly commanderLabel: Phaser.GameObjects.Text;
  private readonly obstacleDamageGraphics: Phaser.GameObjects.Graphics;

  public constructor(private readonly scene: Phaser.Scene) {
    this.animationCatalog.register(scene);
    this.core = new BattlefieldSpriteView(
      scene,
      this.facingResolver,
      this.animationCatalog,
      'core',
      this.coreState(0, 0, 1),
    );
    this.coreHud = scene.add.graphics().setDepth(29);
    this.coreLabel = scene.add
      .text(0, 0, '', {
        backgroundColor: '#171321dd',
        color: '#d8ffd0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(29);
    this.commanderLabel = scene.add
      .text(0, 0, '지휘관', {
        backgroundColor: '#173d3bcc',
        color: '#dffff7',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(29)
      .setVisible(false);
    this.obstacleDamageGraphics = scene.add.graphics().setDepth(14);
  }

  public renderCore(column: number, row: number, healthRatio: number): void {
    this.core.sync(this.coreState(column, row, healthRatio));
    const point = this.toWorld(column, row);
    const ratio = Phaser.Math.Clamp(healthRatio, 0, 1);
    this.coreHud.clear();
    this.coreHud.fillStyle(0x171321, 0.96);
    this.coreHud.fillRoundedRect(point.x - 38, point.y - 42, 76, 8, 4);
    this.coreHud.fillStyle(ratio > 0.4 ? 0x8bd17c : 0xff6b6b, 1);
    this.coreHud.fillRoundedRect(point.x - 36, point.y - 40, 72 * ratio, 4, 2);
    this.coreLabel
      .setPosition(point.x, point.y + 39)
      .setText(`코어 ${Math.round(ratio * 100)}%`)
      .setColor(ratio > 0.4 ? '#d8ffd0' : '#ffd2d8');
  }

  public renderStructures(
    structures: readonly DefenseStructure[],
    disabledTowerIds: ReadonlySet<string> = new Set<string>(),
  ): void {
    const descriptors = structures.map((structure): SpriteDescriptor => {
      const point = this.toWorld(structure.position.column, structure.position.row);
      const texture = this.structureTexture(structure);
      const obstacleVisual =
        structure.kind === 'obstacle'
          ? this.obstacleVisualPolicy.resolve(structure, structures)
          : null;
      return {
        id: structure.id,
        texture,
        x: point.x,
        y: point.y,
        displaySize: structure.kind === 'obstacle' ? 56 : 66,
        displayWidth: structure.kind === 'obstacle' ? 66 : undefined,
        displayHeight: structure.kind === 'obstacle' ? 44 : undefined,
        depth: 12,
        baseColor: structure.kind === 'obstacle' ? 0xb69c7b : 0xe95e4f,
        baseScale: structure.kind === 'obstacle' ? 0.72 : 0.66,
        naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(texture),
        initialFacingDegrees: obstacleVisual?.rotationDegrees ?? 0,
        facingMode: structure.kind === 'tower' ? 'free' : 'static',
        enableMovementBob: false,
        isDisrupted: disabledTowerIds.has(structure.id),
        tint: obstacleVisual?.tint,
      };
    });
    this.sync(this.structures, descriptors);
    this.renderObstacleDamage(structures);
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
        displaySize:
          enemy.stats.archetype === 'tank'
            ? 68
            : enemy.stats.archetype === 'ranger'
              ? 62
              : 56,
        depth: 15,
        baseColor: 0xe95e4f,
        tint: 0xff8b82,
        naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(texture),
        initialFacingDegrees: 0,
        facingMode: 'eight-way',
        enableMovementBob: true,
        animationProfile: this.animationCatalog.profileFor(texture),
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
        displaySize:
          unit.kind === 'tank' ? 68 : unit.kind === 'ranger' ? 62 : 56,
        depth: 16,
        baseColor: 0x159b8c,
        tint: 0x79e5d8,
        naturalFacingDegrees: this.facingProfile.naturalFacingDegrees(texture),
        initialFacingDegrees: 0,
        facingMode: 'eight-way',
        enableMovementBob: true,
        animationProfile: this.animationCatalog.profileFor(texture),
      };
    });
    this.sync(this.attackers, descriptors);
  }

  public renderCommander(commander: AttackCommander | null): void {
    if (commander === null) {
      this.commander?.destroy();
      this.commander = null;
      this.commanderLabel.setVisible(false);
      return;
    }

    const point = this.toWorld(commander.position.column, commander.position.row);
    const state: BattlefieldSpriteState = {
      texture: IMAGE_ASSETS.commander,
      x: point.x,
      y: point.y,
      displaySize: 76,
      depth: 17,
      baseColor: 0xf2b544,
      baseScale: 0.78,
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
        this.animationCatalog,
        'commander',
        state,
      );
    } else {
      this.commander.sync(state);
    }
    this.commanderLabel
      .setPosition(point.x, point.y + 38)
      .setVisible(commander.isAlive);
  }

  public present(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (event.type !== 'attack') continue;
      const source = this.attackSourceFor(event);
      const targetPoint = this.toWorld(event.target.column, event.target.row);
      source?.playAttackToward(targetPoint.x, targetPoint.y);
      this.nearestSpriteTo(event.target, this.allSprites())?.flashHit(
        event.effectiveness,
      );
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
            this.animationCatalog,
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
      displaySize: 72,
      depth: 9,
      baseColor: 0xf2b544,
      baseScale: 0.82,
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

  private renderObstacleDamage(structures: readonly DefenseStructure[]): void {
    this.obstacleDamageGraphics.clear();
    for (const structure of structures) {
      if (structure.kind !== 'obstacle') continue;
      const visual = this.obstacleVisualPolicy.resolve(structure, structures);
      if (visual.damageState === 'intact') continue;
      const center = this.toWorld(
        structure.position.column,
        structure.position.row,
      );
      this.drawCrack(center, visual, [
        [-13, -9],
        [-4, -2],
        [-9, 8],
        [2, 2],
        [10, 9],
      ]);
      if (visual.damageState === 'critical') {
        this.drawCrack(center, visual, [
          [9, -11],
          [3, -4],
          [12, 1],
          [5, 10],
        ]);
      }
    }
  }

  private drawCrack(
    center: Phaser.Math.Vector2,
    visual: ObstacleVisualState,
    points: readonly (readonly [number, number])[],
  ): void {
    const first = points[0];
    if (first === undefined) return;
    const rotate = ([x, y]: readonly [number, number]) =>
      visual.rotationDegrees === 90
        ? { x: center.x - y, y: center.y + x }
        : { x: center.x + x, y: center.y + y };
    const start = rotate(first);
    this.obstacleDamageGraphics.lineStyle(3, 0x54271f, 0.9);
    this.obstacleDamageGraphics.beginPath();
    this.obstacleDamageGraphics.moveTo(start.x, start.y);
    for (const point of points.slice(1)) {
      const next = rotate(point);
      this.obstacleDamageGraphics.lineTo(next.x, next.y);
    }
    this.obstacleDamageGraphics.strokePath();
  }

  private toWorld(column: number, row: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }
}
