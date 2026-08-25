import Phaser from 'phaser';
import {
  GRID_CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
} from '../../config/BattlefieldConfig';
import type {
  CombatAttackStyle,
  CombatEvent,
  CombatHitEffectiveness,
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
  private readonly lastFavoredCalloutAt = new Map<string, number>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public present(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (event.type === 'attack') {
        this.playAttack(
          event.source,
          event.target,
          event.style,
          event.effectiveness,
          event.damage,
        );
      } else if (event.type === 'destroyed') {
        this.playDestruction(event.position, event.targetKind === 'structure');
        this.playCallout(
          event.position,
          event.targetKind === 'structure' ? '방어 시설 파괴!' : '격파!',
          event.targetKind === 'structure' ? '#ffd166' : '#9fe3c3',
        );
      } else {
        this.playCoreHit(event.position);
        this.playCallout(
          event.position,
          `코어 -${Math.max(1, Math.round(event.damage))}`,
          '#ff9bab',
        );
      }
    }
  }

  public playStrategicCallout(
    position: CombatPoint,
    message: string,
    color = '#fff0a8',
  ): void {
    this.playCallout(position, message, color);
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
    effectiveness: CombatHitEffectiveness,
    damage: number,
  ): void {
    const source = this.toWorld(sourcePosition);
    const target = this.toWorld(targetPosition);
    const color = ATTACK_COLORS[style];
    const angle = Phaser.Math.RadToDeg(
      Math.atan2(target.y - source.y, target.x - source.x),
    );
    const favored = effectiveness === 'favored';
    const trail = this.scene.add.graphics().setDepth(41);
    trail.lineStyle(
      favored ? 4 : 2,
      color,
      favored ? 0.62 : 0.3,
    );
    trail.lineBetween(source.x, source.y, target.x, target.y);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: favored ? 190 : 120,
      onComplete: () => trail.destroy(),
    });
    const muzzle = this.scene.add
      .image(source.x, source.y, IMAGE_ASSETS.muzzleFlash)
      .setDepth(42)
      .setTint(color)
      .setAngle(angle)
      .setDisplaySize(
        style === 'mortar' ? 36 : favored ? 31 : 25,
        style === 'mortar' ? 36 : favored ? 31 : 25,
      );
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
      .setDisplaySize(
        style === 'mortar' ? 19 : style === 'piercer' ? 22 : favored ? 14 : 10,
        style === 'piercer' ? 7 : style === 'mortar' ? 19 : favored ? 14 : 10,
      )
      .setAngle(style === 'piercer' ? angle : 0);
    const flight = { progress: 0 };
    this.scene.tweens.add({
      targets: flight,
      progress: 1,
      duration: style === 'mortar' ? 260 : style === 'piercer' ? 115 : 95,
      ease: style === 'mortar' ? 'Sine.easeInOut' : 'Sine.easeIn',
      onUpdate: () => {
        const arc =
          style === 'mortar' ? Math.sin(Math.PI * flight.progress) * 58 : 0;
        projectile.setPosition(
          Phaser.Math.Linear(source.x, target.x, flight.progress),
          Phaser.Math.Linear(source.y, target.y, flight.progress) - arc,
        );
        if (style !== 'piercer') projectile.setAngle(180 * flight.progress);
      },
      onComplete: () => {
        projectile.destroy();
        this.playImpact(
          target,
          color,
          style === 'mortar',
          effectiveness,
        );
        this.playFavoredCallout(targetPosition, damage, effectiveness);
      },
    });
  }

  private playImpact(
    point: Phaser.Math.Vector2,
    color: number,
    heavy: boolean,
    effectiveness: CombatHitEffectiveness,
  ): void {
    const favored = effectiveness === 'favored';
    const spark = this.scene.add
      .image(point.x, point.y, IMAGE_ASSETS.impactSpark)
      .setDepth(44)
      .setTint(color)
      .setDisplaySize(heavy ? 42 : favored ? 38 : 28, heavy ? 42 : favored ? 38 : 28);
    const ring = this.scene.add
      .circle(point.x, point.y, favored ? 19 : 12)
      .setStrokeStyle(favored ? 4 : 2, favored ? 0xfff0a8 : color, 0.95)
      .setDepth(43);
    this.scene.tweens.add({
      targets: spark,
      displayWidth: heavy ? 66 : favored ? 60 : 45,
      displayHeight: heavy ? 66 : favored ? 60 : 45,
      alpha: 0,
      angle: 100,
      duration: heavy ? 260 : 170,
      onComplete: () => spark.destroy(),
    });
    this.scene.tweens.add({
      targets: ring,
      scaleX: favored ? 2.1 : 1.65,
      scaleY: favored ? 2.1 : 1.65,
      alpha: 0,
      duration: favored ? 230 : 150,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    if (favored) this.scene.cameras.main.shake(75, 0.0012);
  }

  private playFavoredCallout(
    position: CombatPoint,
    damage: number,
    effectiveness: CombatHitEffectiveness,
  ): void {
    if (effectiveness !== 'favored') return;
    const key = `${Math.round(position.column * 2)}:${Math.round(position.row * 2)}`;
    const now = this.scene.time.now;
    if (now - (this.lastFavoredCalloutAt.get(key) ?? -1_000) < 360) return;
    this.lastFavoredCalloutAt.set(key, now);
    this.playCallout(position, `약점! -${Math.max(1, Math.round(damage))}`, '#fff0a8');
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

  private playCallout(
    position: CombatPoint,
    message: string,
    color: string,
  ): void {
    const point = this.toWorld(position);
    const label = this.scene.add
      .text(point.x, point.y - 20, message, {
        backgroundColor: '#171321cc',
        color,
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(48);
    this.scene.tweens.add({
      targets: label,
      y: point.y - 48,
      alpha: 0,
      duration: 680,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private toWorld(position: CombatPoint): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + position.column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + position.row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }
}
