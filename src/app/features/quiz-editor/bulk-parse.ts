import { NewItem } from '../../core/services/quiz-store.service';
import { splitAlternatives } from './alternatives';

export interface BulkParseResult {
  items: NewItem[];
  /** 1-based numbers of non-empty lines without a recognisable question and answer. */
  skipped: number[];
}

/**
 * One question per line: question, answer and an optional note, separated by
 * a tab (pasted from a spreadsheet), "=" or " - ". Each line picks the first of
 * those separators it contains, so a hyphen inside a word is never a separator.
 */
export function parseBulkText(text: string): BulkParseResult {
  const result: BulkParseResult = { items: [], skipped: [] };
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) {
      return;
    }
    const parts = splitLine(line);
    const questions = splitAlternatives(parts[0] ?? '');
    const answers = splitAlternatives(parts[1] ?? '');
    if (parts.length < 2 || questions.length === 0 || answers.length === 0) {
      result.skipped.push(index + 1);
      return;
    }
    const remark = parts.slice(2).join(' ').trim() || undefined;
    result.items.push({ questions, answers, remark });
  });
  return result;
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t');
  }
  if (line.includes('=')) {
    return line.split('=');
  }
  return line.split(/\s+-\s+/);
}
