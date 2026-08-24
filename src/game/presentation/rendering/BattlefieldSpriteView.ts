import type Phaser from 'phaser';
import type { CombatHitEffectiveness } from '../../domain/combat/CombatEvent';
import type { FacingDirectionResolver } from './FacingDirectionResolver';
import type {
  DirectionalAnimationCatalog,
  DirectionalAnimationProfile,
} from './DirectionalAnimationCatalog';
import { SpriteAnimationStateMachine } from './SpriteAnimationStateMachine';

export type SpriteFacingMode = 'static' | 'eight-way' | 'free';

const WALK_GRACE_DURATION_MS = 140;

export interface BattlefieldSpriteState {
  readonly texture: string;
  readonly x: number;
  readonly y: number;
  readonly displaySize: number;
  readonly displayWidth?: number;
  readonly displayHeight?: number;
  readonly depth: number;
  readonly naturalFacingDegrees: number;
  readonly initialFacingDegrees: number;
  readonly facingMode: SpriteFacingMode;
  readonly enableMovementBob: boolean;
  readonly isDisrupted?: boolean;
  readonly baseColor?: number;
  readonly baseScale?: number;
  readonly tint?: number;
  readonly alpha?: number;
  readonly animationProfile?: DirectionalAnimationProfile | null;
}

export class BattlefieldSpriteView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly toyBase: Phaser.GameObjects.Ellipse;
  private readonly image: Phaser.GameObjects.Sprite;
  private readonly animationState = new SpriteAnimationStateMachine();
  private currentState: BattlefieldSpriteState;
  private worldFacingDegrees: number;
  private renderedRotationDegrees: number;
  private previousX: number;
  private previousY: number;
  private attackFacingUntilMs = 0;
  private recoilUntilMs = 0;
  private recoilX = 0;
  private recoilY = 0;
  private hitFlashUntilMs = 0;
  private hitReactionUntilMs = 0;
  private hitReactionStrength = 0;
  private currentAnimationKey: string | null = null;
  private readonly motionPhase: number;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly facingResolver: FacingDirectionResolver,
    private readonly animationCatalog: DirectionalAnimationCatalog,
    id: string,
    initialState: BattlefieldSpriteState,
  ) {
    this.currentState = initialState;
    this.worldFacingDegrees = initialState.initialFacingDegrees;
    this.renderedRotationDegrees = facingResolver.spriteRotationDegrees(
      this.worldFacingDegrees,
      initialState.naturalFacingDegrees,
    );
    this.previousX = initialState.x;
    this.previousY = initialState.y;
    this.motionPhase = this.phaseFor(id);
    this.shadow = scene.add
      .ellipse(initialState.x, initialState.y, 10, 5, 0x08070d, 0.28)
      .setDepth(initialState.depth - 1);
    this.toyBase = scene.add
      .ellipse(initialState.x, initialState.y, 10, 5, initialState.baseColor ?? 0xffffff, 0.9)
      .setStrokeStyle(2, 0xfff4d6, 0.82)
      .setDepth(initialState.depth - 0.5)
      .setVisible(initialState.baseColor !== undefined);
    this.image = scene.add
      .sprite(initialState.x, initialState.y, initialState.texture)
      .setDepth(initialState.depth);
    this.sync(initialState);
  }

  public sync(state: BattlefieldSpriteState): void {
    const now = this.scene.time.now;
    const deltaX = state.x - this.previousX;
    const deltaY = state.y - this.previousY;
    const isMoving = Math.hypot(deltaX, deltaY) > 0.001;

    if (state.facingMode === 'static') {
      this.worldFacingDegrees = state.initialFacingDegrees;
    }

    if (
      isMoving &&
      state.facingMode !== 'static' &&
      now >= this.attackFacingUntilMs
    ) {
      const movementFacing =
        state.facingMode === 'eight-way'
          ? this.facingResolver.eightWayDegrees(deltaX, deltaY)
          : this.facingResolver.directionDegrees(deltaX, deltaY);
      if (movementFacing !== null) this.worldFacingDegrees = movementFacing;
    }

    const targetRotation = this.facingResolver.spriteRotationDegrees(
      this.worldFacingDegrees,
      state.naturalFacingDegrees,
    );
    this.renderedRotationDegrees = this.facingResolver.approachDegrees(
      this.renderedRotationDegrees,
      targetRotation,
      state.facingMode === 'free' ? 22 : 18,
    );

    const bob =
      isMoving && state.enableMovementBob
        ? Math.sin(now * 0.018 + this.motionPhase) * 1.7
        : 0;
    const disruptionWobble = state.isDisrupted
      ? Math.sin(now * 0.045 + this.motionPhase) * 4
      : 0;
    const recoilRatio = Math.max(0, (this.recoilUntilMs - now) / 120);
    const hitRatio = Math.max(0, (this.hitReactionUntilMs - now) / 150);
    const hitShake =
      Math.sin(now * 0.19 + this.motionPhase) * this.hitReactionStrength * hitRatio;
    const hitStretch = 1 + hitRatio * this.hitReactionStrength * 0.012;
    const alpha = state.alpha ?? 1;
    const tint = state.tint ?? 0xffffff;

    this.shadow
      .setPosition(state.x, state.y + state.displaySize * 0.29)
      .setDisplaySize(state.displaySize * 0.64, state.displaySize * 0.22)
      .setDepth(state.depth - 1)
      .setAlpha(0.28 * alpha)
      .setVisible(true);
    const baseScale = state.baseScale ?? 0.62;
    this.toyBase
      .setPosition(state.x, state.y + state.displaySize * 0.27)
      .setDisplaySize(state.displaySize * baseScale, state.displaySize * 0.24)
      .setFillStyle(state.baseColor ?? 0xffffff, 0.92)
      .setDepth(state.depth - 0.5)
      .setAlpha(alpha)
      .setVisible(state.baseColor !== undefined);
    const animationProfile = state.animationProfile ?? null;
    if (isMoving) {
      this.animationState.observeMovement(now, WALK_GRACE_DURATION_MS);
    }
    const action = this.animationState.resolve(now);
    if (animationProfile === null) {
      this.image.anims.stop();
      this.image.setTexture(state.texture);
      this.currentAnimationKey = null;
    } else {
      const direction = this.animationCatalog.directionForDegrees(
        this.worldFacingDegrees,
      );
      if (action === 'idle') {
        this.image.anims.stop();
        this.image.setTexture(
          animationProfile.walkTexture,
          this.animationCatalog.idleFrame(direction),
        );
        this.currentAnimationKey = null;
      } else {
        const animationKey = this.animationCatalog.animationKey(
          animationProfile,
          action,
          direction,
        );
        if (this.currentAnimationKey !== animationKey) {
          this.image.play(animationKey);
          this.currentAnimationKey = animationKey;
        }
      }
    }

    this.image
      .setPosition(
        state.x + this.recoilX * recoilRatio + hitShake,
        state.y + bob + this.recoilY * recoilRatio,
      )
      .setDisplaySize(
        (state.displayWidth ?? state.displaySize) * hitStretch,
        (state.displayHeight ?? state.displaySize) / hitStretch,
      )
      .setDepth(state.depth)
      .setAngle(
        (animationProfile === null ? this.renderedRotationDegrees : 0) +
          disruptionWobble,
      )
      .setAlpha(alpha)
      .setVisible(true);

    if (now < this.hitFlashUntilMs) {
      this.image.setTintFill(0xffffff);
    } else {
      this.image.clearTint().setTint(tint);
    }

    this.currentState = state;
    this.previousX = state.x;
    this.previousY = state.y;
  }

  public playAttackToward(targetX: number, targetY: number): void {
    const deltaX = targetX - this.currentState.x;
    const deltaY = targetY - this.currentState.y;
    const length = Math.hypot(deltaX, deltaY);
    if (length < 0.0001 || this.currentState.facingMode === 'static') return;

    const direction =
      this.currentState.facingMode === 'eight-way'
        ? this.facingResolver.eightWayDegrees(deltaX, deltaY)
        : this.facingResolver.directionDegrees(deltaX, deltaY);
    if (direction !== null) this.worldFacingDegrees = direction;

    this.attackFacingUntilMs = this.scene.time.now + 220;
    this.animationState.beginAttack(this.scene.time.now, 340);
    this.recoilUntilMs = this.scene.time.now + 120;
    this.recoilX = (-deltaX / length) * 4;
    this.recoilY = (-deltaY / length) * 4;
  }

  public flashHit(effectiveness: CombatHitEffectiveness): void {
    const favored = effectiveness === 'favored';
    this.hitFlashUntilMs = this.scene.time.now + (favored ? 135 : 90);
    this.hitReactionUntilMs = this.scene.time.now + (favored ? 180 : 130);
    this.hitReactionStrength = favored ? 5 : 2.5;
  }

  public distanceSquaredTo(x: number, y: number): number {
    return (
      (this.currentState.x - x) ** 2 + (this.currentState.y - y) ** 2
    );
  }

  public destroy(): void {
    this.shadow.destroy();
    this.toyBase.destroy();
    this.image.destroy();
  }

  private phaseFor(id: string): number {
    let value = 0;
    for (const character of id) value += character.charCodeAt(0);
    return (value % 17) * 0.37;
  }
}
