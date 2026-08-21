import type Phaser from 'phaser';
import type { FacingDirectionResolver } from './FacingDirectionResolver';

export type SpriteFacingMode = 'static' | 'eight-way' | 'free';

export interface BattlefieldSpriteState {
  readonly texture: string;
  readonly x: number;
  readonly y: number;
  readonly displaySize: number;
  readonly depth: number;
  readonly naturalFacingDegrees: number;
  readonly initialFacingDegrees: number;
  readonly facingMode: SpriteFacingMode;
  readonly enableMovementBob: boolean;
  readonly isDisrupted?: boolean;
  readonly tint?: number;
  readonly alpha?: number;
}

export class BattlefieldSpriteView {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly image: Phaser.GameObjects.Image;
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
  private readonly motionPhase: number;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly facingResolver: FacingDirectionResolver,
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
    this.image = scene.add
      .image(initialState.x, initialState.y, initialState.texture)
      .setDepth(initialState.depth);
    this.sync(initialState);
  }

  public sync(state: BattlefieldSpriteState): void {
    const now = this.scene.time.now;
    const deltaX = state.x - this.previousX;
    const deltaY = state.y - this.previousY;
    const isMoving = Math.hypot(deltaX, deltaY) > 0.001;

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
    const alpha = state.alpha ?? 1;
    const tint = state.tint ?? 0xffffff;

    this.shadow
      .setPosition(state.x, state.y + state.displaySize * 0.29)
      .setDisplaySize(state.displaySize * 0.64, state.displaySize * 0.22)
      .setDepth(state.depth - 1)
      .setAlpha(0.28 * alpha)
      .setVisible(true);
    this.image
      .setTexture(state.texture)
      .setPosition(
        state.x + this.recoilX * recoilRatio,
        state.y + bob + this.recoilY * recoilRatio,
      )
      .setDisplaySize(state.displaySize, state.displaySize)
      .setDepth(state.depth)
      .setAngle(this.renderedRotationDegrees + disruptionWobble)
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
    this.recoilUntilMs = this.scene.time.now + 120;
    this.recoilX = (-deltaX / length) * 4;
    this.recoilY = (-deltaY / length) * 4;
  }

  public flashHit(): void {
    this.hitFlashUntilMs = this.scene.time.now + 90;
  }

  public distanceSquaredTo(x: number, y: number): number {
    return (
      (this.currentState.x - x) ** 2 + (this.currentState.y - y) ** 2
    );
  }

  public destroy(): void {
    this.shadow.destroy();
    this.image.destroy();
  }

  private phaseFor(id: string): number {
    let value = 0;
    for (const character of id) value += character.charCodeAt(0);
    return (value % 17) * 0.37;
  }
}
