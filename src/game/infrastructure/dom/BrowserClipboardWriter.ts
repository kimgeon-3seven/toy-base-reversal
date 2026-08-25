import type { ClipboardWriter } from '../../ports/ClipboardWriter';

type BrowserClipboard = Pick<Clipboard, 'writeText'>;

export class BrowserClipboardWriter implements ClipboardWriter {
  public constructor(private readonly clipboard: BrowserClipboard | undefined) {}

  public async writeText(text: string): Promise<void> {
    if (this.clipboard === undefined) {
      throw new Error('Clipboard API is unavailable.');
    }
    await this.clipboard.writeText(text);
  }
}
