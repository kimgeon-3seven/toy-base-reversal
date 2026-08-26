import { describe, expect, it } from 'vitest';
import { WalkAnimationCadence } from './WalkAnimationCadence';

describe('WalkAnimationCadence', () => {
  const cadence = new WalkAnimationCadence();

  it('slows heavy units and accelerates fast units from their real speed', () => {
    expect(cadence.timeScaleFor(1.15)).toBeCloseTo(5.75 / 8);
    expect(cadence.timeScaleFor(1.5)).toBeCloseTo(7.5 / 8);
    expect(cadence.timeScaleFor(2.05)).toBeCloseTo(10.25 / 8);
  });

  it('clamps extreme speeds to a readable web-game cadence', () => {
    expect(cadence.timeScaleFor(0.1)).toBe(4 / 8);
    expect(cadence.timeScaleFor(10)).toBe(11 / 8);
  });

  it('uses the authored base cadence when movement speed is unavailable', () => {
    expect(cadence.timeScaleFor()).toBe(1);
    expect(cadence.timeScaleFor(Number.NaN)).toBe(1);
  });
});
