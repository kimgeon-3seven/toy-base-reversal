export type PauseOrigin = 'manual' | 'page-inactive';

export class GamePauseState {
  private currentOrigin: PauseOrigin | null = null;

  public get isPaused(): boolean {
    return this.currentOrigin !== null;
  }

  public get origin(): PauseOrigin | null {
    return this.currentOrigin;
  }

  public pause(origin: PauseOrigin): boolean {
    if (this.currentOrigin !== null) return false;
    this.currentOrigin = origin;
    return true;
  }

  public resume(): boolean {
    if (this.currentOrigin === null) return false;
    this.currentOrigin = null;
    return true;
  }

  public reset(): void {
    this.currentOrigin = null;
  }
}
