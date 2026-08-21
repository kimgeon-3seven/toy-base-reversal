import type { NicknameEditor } from '../../ports/NicknameEditor';

export class DomNicknameEditor implements NicknameEditor {
  private isOpen = false;

  public constructor(private readonly parent: HTMLElement) {}

  public requestNickname(currentNickname: string): Promise<string | null> {
    if (this.isOpen) return Promise.resolve(null);
    this.isOpen = true;

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'nickname-dialog-backdrop';
      overlay.setAttribute('role', 'presentation');

      const form = document.createElement('form');
      form.className = 'nickname-dialog';
      form.setAttribute('role', 'dialog');
      form.setAttribute('aria-modal', 'true');
      form.setAttribute('aria-labelledby', 'nickname-dialog-title');
      form.setAttribute('aria-describedby', 'nickname-dialog-description');

      const title = document.createElement('h2');
      title.id = 'nickname-dialog-title';
      title.textContent = '장난감 지휘관 이름';

      const description = document.createElement('p');
      description.id = 'nickname-dialog-description';
      description.textContent =
        '온라인 순위표에 표시할 이름을 1~24자로 입력하세요.';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentNickname;
      input.maxLength = 24;
      input.required = true;
      input.setAttribute('autocomplete', 'nickname');
      input.setAttribute('aria-label', '닉네임');

      const error = document.createElement('p');
      error.className = 'nickname-dialog-error';
      error.setAttribute('aria-live', 'polite');

      const actions = document.createElement('div');
      actions.className = 'nickname-dialog-actions';
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.textContent = '취소';
      const saveButton = document.createElement('button');
      saveButton.type = 'submit';
      saveButton.textContent = '저장';

      actions.append(cancelButton, saveButton);
      form.append(title, description, input, error, actions);
      overlay.append(form);
      this.parent.append(overlay);

      const close = (nickname: string | null): void => {
        overlay.remove();
        this.isOpen = false;
        resolve(nickname);
      };

      cancelButton.addEventListener('click', () => close(null));
      overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close(null);
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const nickname = input.value.trim();
        if (nickname.length === 0) {
          error.textContent = '한 글자 이상 입력하세요.';
          input.focus();
          return;
        }
        close(nickname);
      });

      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    });
  }
}
