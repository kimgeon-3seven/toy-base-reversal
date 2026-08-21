export interface NicknameEditor {
  requestNickname(currentNickname: string): Promise<string | null>;
}
