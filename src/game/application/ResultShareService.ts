import type { ClipboardWriter } from '../ports/ClipboardWriter';

export interface ResultShareSummary {
  readonly title: string;
  readonly lines: readonly string[];
}

export class ResultShareService {
  public constructor(
    private readonly clipboard: ClipboardWriter,
    private readonly gameUrl: string,
  ) {}

  public async copy(summary: ResultShareSummary): Promise<boolean> {
    try {
      await this.clipboard.writeText(
        [
          'TOY BASE REVERSAL',
          summary.title,
          ...summary.lines,
          `플레이: ${this.gameUrl}`,
        ].join('\n'),
      );
      return true;
    } catch {
      return false;
    }
  }
}
