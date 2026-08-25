import { describe, expect, it } from 'vitest';
import type { FullscreenGateway } from '../ports/FullscreenGateway';
import type {
  WebEntryGameActions,
  WebEntryReadyActions,
  WebEntryView,
} from '../ports/WebEntryView';
import { WebEntryCoordinator } from './WebEntryCoordinator';

class FakeFullscreenGateway implements FullscreenGateway {
  public active = false;
  public enterCount = 0;
  public toggleCount = 0;
  private readonly listeners: Array<(active: boolean) => void> = [];

  public constructor(public readonly supported = true) {}

  public async enter(): Promise<boolean> {
    this.enterCount += 1;
    this.active = true;
    this.emit();
    return true;
  }

  public async toggle(): Promise<boolean> {
    this.toggleCount += 1;
    this.active = !this.active;
    this.emit();
    return this.active;
  }

  public onChange(listener: (active: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => undefined;
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.active);
  }
}

class FakeWebEntryView implements WebEntryView {
  public progress: number[] = [];
  public readyActions: WebEntryReadyActions | null = null;
  public gameActions: WebEntryGameActions | null = null;
  public fullscreenStates: boolean[] = [];
  public phase = '';
  public retry: (() => void) | null = null;

  public showLoading(progress: number): void {
    this.phase = 'loading';
    this.progress.push(progress);
  }

  public showReady(
    _fullscreenSupported: boolean,
    actions: WebEntryReadyActions,
  ): void {
    this.phase = 'ready';
    this.readyActions = actions;
  }

  public showStarting(): void {
    this.phase = 'starting';
  }

  public showGame(
    _fullscreenSupported: boolean,
    actions: WebEntryGameActions,
  ): void {
    this.phase = 'game';
    this.gameActions = actions;
  }

  public showFailure(_message: string, retry: () => void): void {
    this.phase = 'failed';
    this.retry = retry;
  }

  public updateFullscreen(active: boolean): void {
    this.fullscreenStates.push(active);
  }
}

describe('WebEntryCoordinator', () => {
  it('clamps loading progress and exposes the ready gate', () => {
    const view = new FakeWebEntryView();
    const coordinator = new WebEntryCoordinator(
      view,
      new FakeFullscreenGateway(),
    );

    coordinator.loading(-1);
    coordinator.reportProgress(0.42);
    coordinator.reportProgress(2);
    coordinator.ready({ activateAudio: async () => undefined, launch: () => undefined });

    expect(view.progress).toEqual([0, 0.42, 1]);
    expect(view.phase).toBe('ready');
    expect(view.readyActions).not.toBeNull();
  });

  it('activates audio once before launching and ignores repeated start clicks', async () => {
    const view = new FakeWebEntryView();
    const coordinator = new WebEntryCoordinator(
      view,
      new FakeFullscreenGateway(),
    );
    const order: string[] = [];
    coordinator.ready({
      activateAudio: async () => {
        order.push('audio');
      },
      launch: () => order.push('launch'),
    });

    view.readyActions?.start();
    view.readyActions?.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(order).toEqual(['audio', 'launch']);
    expect(view.phase).toBe('game');
  });

  it('requests fullscreen from the user action before launching', async () => {
    const view = new FakeWebEntryView();
    const fullscreen = new FakeFullscreenGateway();
    const coordinator = new WebEntryCoordinator(view, fullscreen);
    let launched = false;
    coordinator.ready({
      activateAudio: async () => undefined,
      launch: () => {
        launched = true;
      },
    });

    view.readyActions?.startFullscreen();
    await Promise.resolve();
    await Promise.resolve();

    expect(fullscreen.enterCount).toBe(1);
    expect(fullscreen.active).toBe(true);
    expect(launched).toBe(true);
  });

  it('offers retry after a loading failure', () => {
    const view = new FakeWebEntryView();
    const coordinator = new WebEntryCoordinator(
      view,
      new FakeFullscreenGateway(),
    );
    let retried = false;

    coordinator.failed('failed', () => {
      retried = true;
    });
    view.retry?.();

    expect(view.phase).toBe('failed');
    expect(retried).toBe(true);
  });
});
