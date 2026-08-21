import Phaser from 'phaser';
import {
  GRID_CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
} from '../../config/BattlefieldConfig';
import type {
  CombatAttackStyle,
  CombatEvent,
  CombatPoint,
} from '../../domain/combat/CombatEvent';
import { IMAGE_ASSETS } from '../assets/GameAssets';

const ATTACK_COLORS: Readonly<Record<CombatAttackStyle, number>> = {
  popgun: 0xffd166,
  mortar: 0xff8c61,
  piercer: 0x8bd17c,
  unit: 0xff8b8b,
  commander: 0x4de1c1,
};

export class BattlefieldEffects {
  public constructor(private readonly scene: Phaser.Scene) {}

  public present(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (event.type === 'attack') {
        this.playAttack(event.source, event.target, event.style);
      } else if (event.type === 'destroyed') {
        this.playDestruction(event.position, event.targetKind === 'structure');
      } else {
        this.playCoreHit(event.position);
      }
    }
  }

  public playAbility(position: CombatPoint, kind: 'focus' | 'disrupt'): void {
    const point = this.toWorld(position);
    const burst = this.scene.add
      .image(point.x, point.y, IMAGE_ASSETS.abilityBurst)
      .setDepth(45)
      .setTint(kind === 'focus' ? 0x4de1c1 : 0x9d8cff)
      .setDisplaySize(34, 34)
      .setAlpha(0.95);
    this.scene.tweens.add({
      targets: burst,
      displayWidth: kind === 'focus' ? 110 : 92,
      displayHeight: kind === 'focus' ? 110 : 92,
      alpha: 0,
      angle: kind === 'focus' ? 90 : -90,
      duration: 430,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  private playAttack(
    sourcePosition: CombatPoint,
    targetPosition: CombatPoint,
    style: CombatAttackStyle,
  ): void {
    const source = this.toWorld(sourcePosition);
    const target = this.toWorld(targetPosition);
    const color = ATTACK_COLORS[style];
    const angle = Phaser.Math.RadToDeg(
      Math.atan2(target.y - source.y, target.x - source.x),
    );
    const muzzle = this.scene.add
      .image(source.x, source.y, IMAGE_ASSETS.muzzleFlash)
      .setDepth(42)
      .setTint(color)
      .setAngle(angle)
      .setDisplaySize(style === 'mortar' ? 34 : 25, style === 'mortar' ? 34 : 25);
    this.scene.tweens.add({
      targets: muzzle,
      alpha: 0,
      scaleX: muzzle.scaleX * 1.35,
      scaleY: muzzle.scaleY * 1.35,
      duration: 100,
      onComplete: () => muzzle.destroy(),
    });

    const projectile = this.scene.add
      .image(source.x, source.y, IMAGE_ASSETS.impactSpark)
      .setDepth(43)
      .setTint(color)
      .setDisplaySize(style === 'mortar' ? 16 : 10, style === 'mortar' ? 16 : 10);
    this.scene.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      angle: 180,
      duration: style === 'mortar' ? 180 : 95,
      ease: 'Sine.easeIn',
      onComplete: () => {
        projectile.destroy();
        this.playImpact(target, color, style === 'mortar');
      },
    });
  }

  private playImpact(
    point: Phaser.Math.Vector2,
    color: number,
    heavy: boolean,
  ): void {
    const spark = this.scene.add
      .image(point.x, point.y, IMAGE_ASSETS.impactSpark)
      .setDepth(44)
      .setTint(color)
      .setDisplaySize(heavy ? 42 : 28, heavy ? 42 : 28);
    this.scene.tweens.add({
      targets: spark,
      displayWidth: heavy ? 66 : 45,
      displayHeight: heavy ? 66 : 45,
      alpha: 0,
      angle: 100,
      duration: heavy ? 260 : 170,
      onComplete: () => spark.destroy(),
    });
  }

  private playDestruction(position: CombatPoint, heavy: boolean): void {
    const point = this.toWorld(position);
    const flash = this.scene.add
      .image(point.x, point.y, IMAGE_ASSETS.explosionFlash)
      .setDepth(44)
      .setTint(heavy ? 0xffa85c : 0xffd166)
      .setDisplaySize(heavy ? 72 : 52, heavy ? 72 : 52);
    const smoke = this.scene.add
      .image(point.x, point.y, IMAGE_ASSETS.smokePuff)
      .setDepth(43)
      .setTint(0xc9c3d8)
      .setDisplaySize(heavy ? 54 : 40, heavy ? 50 : 38)
      .setAlpha(0.78);
    this.scene.tweens.add({
      targets: flash,
      displayWidth: heavy ? 105 : 76,
      displayHeight: heavy ? 105 : 76,
      alpha: 0,
      duration: 240,
      onComplete: () => flash.destroy(),
    });
    this.scene.tweens.add({
      targets: smoke,
      y: point.y - 18,
      displayWidth: heavy ? 84 : 65,
      displayHeight: heavy ? 78 : 60,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => smoke.destroy(),
    });
  }

  private playCoreHit(position: CombatPoint): void {
    const point = this.toWorld(position);
    const burst = this.scene.add
      .image(point.x, point.y, IMAGE_ASSETS.abilityBurst)
      .setDepth(45)
      .setTint(0xff6b6b)
      .setDisplaySize(48, 48);
    this.scene.tweens.add({
      targets: burst,
      displayWidth: 125,
      displayHeight: 125,
      alpha: 0,
      angle: 140,
      duration: 480,
      onComplete: () => burst.destroy(),
    });
    this.scene.cameras.main.shake(120, 0.0025);
  }

  private toWorld(position: CombatPoint): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + position.column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + position.row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }
}
