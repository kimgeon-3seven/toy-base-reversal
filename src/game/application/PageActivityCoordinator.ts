import type { PageActivityMonitor } from '../ports/PageActivityMonitor';

export interface PageActivityActions {
  readonly deactivate: () => void;
  readonly activate: () => void;
}

export class PageActivityCoordinator {
  private unsubscribe: (() => void) | null = null;

  public constructor(
    private readonly monitor: PageActivityMonitor,
    private readonly actions: PageActivityActions,
  ) {}

  public start(): void {
    if (this.unsubscribe !== null) return;
    this.unsubscribe = this.monitor.subscribe((active) => {
      if (active) this.actions.activate();
      else this.actions.deactivate();
    });
    if (!this.monitor.isActive) this.actions.deactivate();
  }

  public stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
