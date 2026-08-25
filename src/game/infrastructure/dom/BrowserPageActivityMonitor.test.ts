import { describe, expect, it } from 'vitest';
import { BrowserPageActivityMonitor } from './BrowserPageActivityMonitor';

class FakeActivityTarget extends EventTarget {
  public hidden = false;
}

describe('BrowserPageActivityMonitor', () => {
  it('publishes one inactive and active transition for blur and focus', () => {
    const documentTarget = new FakeActivityTarget();
    const windowTarget = new EventTarget();
    const monitor = new BrowserPageActivityMonitor(
      documentTarget,
      windowTarget,
    );
    const events: boolean[] = [];
    const unsubscribe = monitor.subscribe((active) => events.push(active));

    windowTarget.dispatchEvent(new Event('blur'));
    windowTarget.dispatchEvent(new Event('blur'));
    windowTarget.dispatchEvent(new Event('focus'));
    unsubscribe();
    windowTarget.dispatchEvent(new Event('blur'));

    expect(events).toEqual([false, true]);
  });

  it('does not become active from focus while the page remains hidden', () => {
    const documentTarget = new FakeActivityTarget();
    const windowTarget = new EventTarget();
    const monitor = new BrowserPageActivityMonitor(
      documentTarget,
      windowTarget,
    );
    const events: boolean[] = [];
    monitor.subscribe((active) => events.push(active));

    documentTarget.hidden = true;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    windowTarget.dispatchEvent(new Event('focus'));
    documentTarget.hidden = false;
    documentTarget.dispatchEvent(new Event('visibilitychange'));

    expect(events).toEqual([false, true]);
  });
});
