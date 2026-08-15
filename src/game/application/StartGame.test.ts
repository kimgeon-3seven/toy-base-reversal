import { describe, expect, it } from 'vitest';
import type { GameRuntime } from '../ports/GameRuntime';
import { StartGame } from './StartGame';

class GameRuntimeSpy implements GameRuntime {
  public startCalls = 0;

  public start(): void {
    this.startCalls += 1;
  }
}

describe('StartGame', () => {
  it('starts the injected game runtime exactly once', () => {
    const runtime = new GameRuntimeSpy();
    const useCase = new StartGame(runtime);

    useCase.execute();

    expect(runtime.startCalls).toBe(1);
  });
});
