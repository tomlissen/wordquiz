/** Parse failure carrying an i18n key so the UI can show a translated message. */
export class QuizParseError extends Error {
  constructor(
    readonly messageKey: string,
    readonly params: Record<string, string | number> = {},
  ) {
    super(messageKey);
    this.name = 'QuizParseError';
  }
}

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  return base || fileName;
}
