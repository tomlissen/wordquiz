/** Alternatives are typed in one field, separated by semicolons. */
export function splitAlternatives(text: string): string[] {
  return text
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function joinAlternatives(values: string[]): string {
  return values.join('; ');
}
