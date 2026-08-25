import type {
  PageActivityListener,
  PageActivityMonitor,
} from '../../ports/PageActivityMonitor';

type ActivityDocument = Pick<
  Document,
  'hidden' | 'addEventListener' | 'removeEventListener'
>;
type ActivityWindow = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export class BrowserPageActivityMonitor implements PageActivityMonitor {
  private windowFocused = true;

  public constructor(
    private readonly document: ActivityDocument,
    private readonly window: ActivityWindow,
  ) {}

  public get isActive(): boolean {
    return !this.document.hidden && this.windowFocused;
  }

  public subscribe(listener: PageActivityListener): () => void {
    let lastPublished = this.isActive;
    const publish = (): void => {
      const active = this.isActive;
      if (active === lastPublished) return;
      lastPublished = active;
      listener(active);
    };
    const onVisibilityChange = (): void => publish();
    const onBlur = (): void => {
      this.windowFocused = false;
      publish();
    };
    const onFocus = (): void => {
      this.windowFocused = true;
      publish();
    };

    this.document.addEventListener('visibilitychange', onVisibilityChange);
    this.window.addEventListener('blur', onBlur);
    this.window.addEventListener('focus', onFocus);

    return () => {
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
      this.window.removeEventListener('blur', onBlur);
      this.window.removeEventListener('focus', onFocus);
    };
  }
}
