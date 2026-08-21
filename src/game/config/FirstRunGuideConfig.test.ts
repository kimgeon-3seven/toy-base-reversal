import { describe, expect, it } from 'vitest';
import { firstRunGuidePromptFor } from './FirstRunGuideConfig';

describe('FirstRunGuideConfig', () => {
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
