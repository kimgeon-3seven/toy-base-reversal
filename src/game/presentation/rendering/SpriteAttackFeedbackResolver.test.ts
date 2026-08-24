import { describe, expect, it } from 'vitest';
import { FacingDirectionResolver } from './FacingDirectionResolver';
import { SpriteAttackFeedbackResolver } from './SpriteAttackFeedbackResolver';

describe('SpriteAttackFeedbackResolver', () => {
  const resolver = new SpriteAttackFeedbackResolver(
    new FacingDirectionResolver(),
  );

  it('keeps the previous facing and removes recoil for an overlapping target', () => {
    expect(resolver.resolve('eight-way', 0, 0)).toEqual({
      facingDegrees: null,
      recoilX: 0,
      recoilY: 0,
    });
  });

  it('resolves eight-way facing and opposite recoil for a distant target', () => {
    const feedback = resolver.resolve('eight-way', 3, 4);

    expect(feedback.facingDegrees).toBe(45);
    expect(feedback.recoilX).toBeCloseTo(-2.4);
    expect(feedback.recoilY).toBeCloseTo(-3.2);
  });

  it('does not rotate or recoil a static sprite', () => {
    expect(resolver.resolve('static', 10, 0)).toEqual({
      facingDegrees: null,
      recoilX: 0,
      recoilY: 0,
    });
  });
});
