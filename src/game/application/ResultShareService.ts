import type { ClipboardWriter } from '../ports/ClipboardWriter';
import { GAME_BRAND } from '../config/GameBrandConfig';

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
          GAME_BRAND.title,
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
