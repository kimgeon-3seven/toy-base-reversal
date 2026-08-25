import { describe, expect, it } from 'vitest';
import { firstRunGuidePromptFor } from './FirstRunGuideConfig';

describe('FirstRunGuideConfig', () => {
  it('limits the first defense prompt to placement and starting combat', () => {
    const prompt = firstRunGuidePromptFor('defense-preparation');

    expect(prompt?.title).toContain('빛나는 칸');
    expect(prompt?.body).toContain('팝건 1개');
    expect(prompt?.body).not.toContain('강화');
  });

  it('uses progressive disclosure for the three commander controls', () => {
    expect(firstRunGuidePromptFor('attack-movement')?.title).toContain('WASD');
    expect(firstRunGuidePromptFor('attack-focus')?.title).toContain('Q');
    expect(firstRunGuidePromptFor('attack-disrupt')?.title).toContain('E');
  });

  it('does not render coach marks for blocking or completed stages', () => {
    expect(firstRunGuidePromptFor('opening')).toBeNull();
    expect(firstRunGuidePromptFor('role-reversal')).toBeNull();
    expect(firstRunGuidePromptFor('complete')).toBeNull();
  });
});
