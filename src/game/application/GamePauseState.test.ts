import { describe, expect, it } from 'vitest';
import { GamePauseState } from './GamePauseState';

describe('GamePauseState', () => {
  it('keeps a manual pause when page inactivity arrives later', () => {
    const state = new GamePauseState();

    expect(state.pause('manual')).toBe(true);
    expect(state.pause('page-inactive')).toBe(false);

    expect(state.isPaused).toBe(true);
    expect(state.origin).toBe('manual');
  });

  it('records an automatic pause until the user explicitly resumes', () => {
    const state = new GamePauseState();

    state.pause('page-inactive');

    expect(state.origin).toBe('page-inactive');
    expect(state.resume()).toBe(true);
    expect(state.isPaused).toBe(false);
  });
});
