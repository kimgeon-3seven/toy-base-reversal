import type { WebEntryDeviceAdvice } from '../../application/WebEntryDeviceAdvisor';
import type {
  WebEntryGameActions,
  WebEntryReadyActions,
  WebEntryView,
} from '../../ports/WebEntryView';

export class DomWebEntryView implements WebEntryView {
  private readonly root: HTMLElement;
  private readonly progressPanel: HTMLElement;
  private readonly progressBar: HTMLProgressElement;
  private readonly progressText: HTMLElement;
  private readonly statusText: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly fullscreenStartButton: HTMLButtonElement;
  private readonly retryButton: HTMLButtonElement;
  private readonly recommendation: HTMLElement;
  private readonly gameFullscreenButton: HTMLButtonElement;

  public constructor(
    documentRef: Document,
    advice: WebEntryDeviceAdvice,
  ) {
    this.root = this.requireElement(documentRef, 'web-entry');
    this.progressPanel = this.requireElement(
      documentRef,
      'web-entry-progress-panel',
    );
    this.progressBar = this.requireElement(
      documentRef,
      'web-entry-progress',
    ) as HTMLProgressElement;
    this.progressText = this.requireElement(
      documentRef,
      'web-entry-progress-text',
    );
    this.statusText = this.requireElement(documentRef, 'web-entry-status');
    this.startButton = this.requireElement(
      documentRef,
      'web-entry-start',
    ) as HTMLButtonElement;
    this.fullscreenStartButton = this.requireElement(
      documentRef,
      'web-entry-start-fullscreen',
    ) as HTMLButtonElement;
    this.retryButton = this.requireElement(
      documentRef,
      'web-entry-retry',
    ) as HTMLButtonElement;
    this.recommendation = this.requireElement(
      documentRef,
      'web-entry-recommendation',
    );
    this.gameFullscreenButton = this.requireElement(
      documentRef,
      'game-fullscreen',
    ) as HTMLButtonElement;

    this.recommendation.textContent = advice.message;
    this.recommendation.dataset.recommended = String(advice.recommended);
  }

  public showLoading(progress: number): void {
    this.root.hidden = false;
    this.root.dataset.phase = 'loading';
    this.progressPanel.hidden = false;
    this.progressBar.value = progress;
    const percentage = Math.round(progress * 100);
    this.progressText.textContent = `${percentage}%`;
    this.statusText.textContent =
      percentage === 0
        ? '장난감 상자를 여는 중입니다…'
        : '이미지와 사운드를 준비하고 있습니다…';
    this.setEntryButtons(false, false, false);
    this.gameFullscreenButton.hidden = true;
  }

  public showReady(
    fullscreenSupported: boolean,
    actions: WebEntryReadyActions,
  ): void {
    this.root.dataset.phase = 'ready';
    this.progressPanel.hidden = true;
    this.statusText.textContent =
      '준비 완료 · 첫 클릭으로 오디오를 활성화하고 게임을 시작합니다.';
    this.setEntryButtons(true, fullscreenSupported, false);
    this.startButton.onclick = actions.start;
    this.fullscreenStartButton.onclick = actions.startFullscreen;
  }

  public showStarting(): void {
    this.root.dataset.phase = 'starting';
    this.statusText.textContent = '전장을 펼치는 중입니다…';
    this.startButton.disabled = true;
    this.fullscreenStartButton.disabled = true;
  }

  public showGame(
    fullscreenSupported: boolean,
    actions: WebEntryGameActions,
  ): void {
    this.root.hidden = true;
    this.gameFullscreenButton.hidden = !fullscreenSupported;
    this.gameFullscreenButton.onclick = actions.toggleFullscreen;
  }

  public showFailure(message: string, retry: () => void): void {
    this.root.hidden = false;
    this.root.dataset.phase = 'failed';
    this.progressPanel.hidden = true;
    this.statusText.textContent = message;
    this.setEntryButtons(false, false, true);
    this.retryButton.onclick = retry;
  }

  public updateFullscreen(active: boolean): void {
    this.gameFullscreenButton.textContent = active
      ? '전체화면 나가기'
      : '전체화면';
    this.gameFullscreenButton.setAttribute('aria-pressed', String(active));
  }

  private setEntryButtons(
    startVisible: boolean,
    fullscreenVisible: boolean,
    retryVisible: boolean,
  ): void {
    this.startButton.hidden = !startVisible;
    this.startButton.disabled = false;
    this.fullscreenStartButton.hidden = !fullscreenVisible;
    this.fullscreenStartButton.disabled = false;
    this.retryButton.hidden = !retryVisible;
  }

  private requireElement(documentRef: Document, id: string): HTMLElement {
    const element = documentRef.getElementById(id);
    if (element === null) throw new Error(`Required entry element #${id} was not found.`);
    return element;
  }
}
