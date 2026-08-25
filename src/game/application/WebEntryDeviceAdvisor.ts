export interface WebEntryDeviceProfile {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly hasFinePointer: boolean;
}

export interface WebEntryDeviceAdvice {
  readonly recommended: boolean;
  readonly message: string;
}

export class WebEntryDeviceAdvisor {
  public advise(profile: WebEntryDeviceProfile): WebEntryDeviceAdvice {
    const hasDesktopViewport =
      profile.viewportWidth >= 1024 && profile.viewportHeight >= 600;
    const recommended = hasDesktopViewport && profile.hasFinePointer;
    return {
      recommended,
      message: recommended
        ? 'PC 브라우저 · 가로 화면 권장'
        : 'PC 브라우저와 가로 화면에서 가장 안정적으로 플레이할 수 있습니다.',
    };
  }
}
