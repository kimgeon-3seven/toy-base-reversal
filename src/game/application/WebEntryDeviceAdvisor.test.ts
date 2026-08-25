import { describe, expect, it } from 'vitest';
import { WebEntryDeviceAdvisor } from './WebEntryDeviceAdvisor';

describe('WebEntryDeviceAdvisor', () => {
  const advisor = new WebEntryDeviceAdvisor();

  it('recommends a desktop-sized browser with a fine pointer', () => {
    expect(
      advisor.advise({
        viewportWidth: 1280,
        viewportHeight: 720,
        hasFinePointer: true,
      }),
    ).toEqual({
      recommended: true,
      message: 'PC 브라우저 · 가로 화면 권장',
    });
  });

  it('warns without blocking a narrow or touch-first browser', () => {
    for (const profile of [
      { viewportWidth: 900, viewportHeight: 720, hasFinePointer: true },
      { viewportWidth: 1280, viewportHeight: 720, hasFinePointer: false },
      { viewportWidth: 1280, viewportHeight: 540, hasFinePointer: true },
    ]) {
      const advice = advisor.advise(profile);
      expect(advice.recommended).toBe(false);
      expect(advice.message).toContain('PC 브라우저');
    }
  });
});
