export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}
