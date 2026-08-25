export interface VisualPoint {
  readonly x: number;
  readonly y: number;
}

export class SpriteVisualBoundary {
  public constructor(
    private readonly left: number,
    private readonly top: number,
    private readonly width: number,
    private readonly height: number,
  ) {
    if (width <= 0 || height <= 0) {
      throw new Error('Sprite visual boundary must have a positive size.');
    }
  }

  public constrainCenter(
    point: VisualPoint,
    displayWidth: number,
    displayHeight: number,
  ): VisualPoint {
    if (displayWidth <= 0 || displayHeight <= 0) {
      throw new Error('Sprite display size must be positive.');
    }
    const halfWidth = Math.min(displayWidth, this.width) / 2;
    const halfHeight = Math.min(displayHeight, this.height) / 2;
    return {
      x: Math.min(
        this.left + this.width - halfWidth,
        Math.max(this.left + halfWidth, point.x),
      ),
      y: Math.min(
        this.top + this.height - halfHeight,
        Math.max(this.top + halfHeight, point.y),
      ),
    };
  }
}
