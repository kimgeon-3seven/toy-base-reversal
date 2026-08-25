import type { FullscreenGateway } from '../ports/FullscreenGateway';
import type {
  WebEntryFlow,
  WebEntryLaunchActions,
} from '../ports/WebEntryFlow';
import type { WebEntryView } from '../ports/WebEntryView';

type WebEntryState = 'loading' | 'ready' | 'starting' | 'started' | 'failed';

export class WebEntryCoordinator implements WebEntryFlow {
  private state: WebEntryState = 'loading';
  private launchActions: WebEntryLaunchActions | null = null;

  public constructor(
    private readonly view: WebEntryView,
    private readonly fullscreen: FullscreenGateway,
  ) {
    this.fullscreen.onChange((active) => this.view.updateFullscreen(active));
  }

  public loading(progress = 0): void {
    this.state = 'loading';
    this.launchActions = null;
    this.view.showLoading(this.clampProgress(progress));
  }

  public reportProgress(progress: number): void {
    if (this.state !== 'loading') return;
    this.view.showLoading(this.clampProgress(progress));
  }

  public ready(actions: WebEntryLaunchActions): void {
    this.state = 'ready';
    this.launchActions = actions;
    this.view.showReady(this.fullscreen.supported, {
      start: () => void this.begin(false),
      startFullscreen: () => void this.begin(true),
    });
  }

  public failed(message: string, retry: () => void): void {
    this.state = 'failed';
    this.launchActions = null;
    this.view.showFailure(message, retry);
  }

  private async begin(requestFullscreen: boolean): Promise<void> {
    if (this.state !== 'ready' || this.launchActions === null) return;
    const actions = this.launchActions;
    this.state = 'starting';
    this.view.showStarting();

    const pending: Promise<unknown>[] = [];
    if (requestFullscreen && this.fullscreen.supported) {
      try {
        pending.push(this.fullscreen.enter());
      } catch {
        // Fullscreen may be blocked by an embedding site. Normal play still starts.
      }
    }

    try {
      pending.push(actions.activateAudio());
    } catch {
      // Audio permission failures must not prevent the game from being playable.
    }
    await Promise.allSettled(pending);

    this.state = 'started';
    this.view.showGame(this.fullscreen.supported, {
      toggleFullscreen: () => void this.toggleFullscreen(),
    });
    this.view.updateFullscreen(this.fullscreen.active);
    actions.launch();
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      const active = await this.fullscreen.toggle();
      this.view.updateFullscreen(active);
    } catch {
      this.view.updateFullscreen(this.fullscreen.active);
    }
  }

  private clampProgress(progress: number): number {
    if (!Number.isFinite(progress)) return 0;
    return Math.min(1, Math.max(0, progress));
  }
}
