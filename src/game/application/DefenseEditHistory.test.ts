import { describe, expect, it } from 'vitest';
import { DefenseBlueprint } from '../domain/battlefield/DefenseBlueprint';
import { DefenseEditHistory, type DefenseEditSnapshot } from './DefenseEditHistory';

function snapshot(constructionFunds: number): DefenseEditSnapshot {
  return {
    blueprint: DefenseBlueprint.capture([]),
    constructionFunds,
  };
}

describe('DefenseEditHistory', () => {
  it('moves edits between undo and redo stacks', () => {
    const history = new DefenseEditHistory();
    history.record(snapshot(10));

    expect(history.undo(snapshot(7))?.constructionFunds).toBe(10);
    expect(history.canRedo).toBe(true);
    expect(history.redo(snapshot(10))?.constructionFunds).toBe(7);
  });

  it('clears redo history after a new edit', () => {
    const history = new DefenseEditHistory();
    history.record(snapshot(10));
    history.undo(snapshot(7));
    history.record(snapshot(8));

    expect(history.canRedo).toBe(false);
  });
});
