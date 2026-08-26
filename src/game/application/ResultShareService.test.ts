import { describe, expect, it } from 'vitest';
import type { ClipboardWriter } from '../ports/ClipboardWriter';
import { ResultShareService } from './ResultShareService';

class FakeClipboardWriter implements ClipboardWriter {
  public text = '';
  public shouldFail = false;

  public async writeText(text: string): Promise<void> {
    if (this.shouldFail) throw new Error('Clipboard blocked.');
    this.text = text;
  }
}

describe('ResultShareService', () => {
  it('copies a compact result with the public game link', async () => {
    const clipboard = new FakeClipboardWriter();
    const service = new ResultShareService(clipboard, 'https://game.example/');

    const copied = await service.copy({
      title: '일반 모드 완료',
      lines: ['5라운드 돌파', '누적 123.4초'],
    });

    expect(copied).toBe(true);
    expect(clipboard.text).toBe(
      'MY TOYBOX TALE: BUILD & BREAK\n일반 모드 완료\n5라운드 돌파\n누적 123.4초\n플레이: https://game.example/',
    );
  });

  it('reports a blocked clipboard without breaking the game flow', async () => {
    const clipboard = new FakeClipboardWriter();
    clipboard.shouldFail = true;
    const service = new ResultShareService(clipboard, 'https://game.example/');

    await expect(service.copy({ title: '결과', lines: [] })).resolves.toBe(false);
  });
});
