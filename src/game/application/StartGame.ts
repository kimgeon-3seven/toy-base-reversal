import type { GameRuntime } from '../ports/GameRuntime';

export class StartGame {
  public constructor(private readonly runtime: GameRuntime) {}

  public execute(): void {
    this.runtime.start();
  }
}
