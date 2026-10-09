import { Quiz } from '../model/quiz.model';
import { parseQuizJson } from './json-parser';
import { QuizParseError } from './parse-error';

/** Accepts .json files, or extensionless files whose content looks like JSON. */
export function parseQuizFile(text: string, fileName: string): Quiz {
  if (fileName.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{')) {
    return parseQuizJson(text, fileName);
  }
  throw new QuizParseError('errors.unknownFormat');
}
