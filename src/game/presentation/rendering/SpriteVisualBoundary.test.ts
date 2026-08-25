import { describe, expect, it } from 'vitest';
import { SpriteVisualBoundary } from './SpriteVisualBoundary';

describe('SpriteVisualBoundary', () => {
  const boundary = new SpriteVisualBoundary(32, 126, 960, 576);

  it('keeps an oversized commander sprite inside every battlefield edge', () => {
    expect(boundary.constrainCenter({ x: 56, y: 150 }, 76, 76)).toEqual({
      x: 70,
      y: 164,
    });
    expect(boundary.constrainCenter({ x: 968, y: 678 }, 76, 76)).toEqual({
      x: 954,
      y: 664,
    });
  });

  it('does not move a sprite that already fits inside the battlefield', () => {
    expect(boundary.constrainCenter({ x: 512, y: 414 }, 76, 76)).toEqual({
      x: 512,
      y: 414,
    });
  });

  it('rejects invalid boundary and sprite sizes', () => {
    expect(() => new SpriteVisualBoundary(0, 0, 0, 100)).toThrow();
    expect(() => boundary.constrainCenter({ x: 0, y: 0 }, 0, 76)).toThrow();
  });
});
