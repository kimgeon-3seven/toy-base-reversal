import { describe, expect, it, vi } from 'vitest';
import { BrowserClipboardWriter } from './BrowserClipboardWriter';

describe('BrowserClipboardWriter', () => {
  it('delegates text to the browser Clipboard API', async () => {
    const writeText = vi.fn(async () => undefined);
    const writer = new BrowserClipboardWriter({ writeText });

    await writer.writeText('result');

    expect(writeText).toHaveBeenCalledWith('result');
  });

  it('fails explicitly when the Clipboard API is unavailable', async () => {
    const writer = new BrowserClipboardWriter(undefined);

    await expect(writer.writeText('result')).rejects.toThrow(
      'Clipboard API is unavailable.',
    );
  });
});
