import { emptyStats, ItemStats, Quiz, QuizItem, TestResult } from '../model/quiz.model';
import { QuizParseError, titleFromFileName } from './parse-error';

/**
 * JSON quiz format (also what export writes):
 *
 *   {
 *     "title": "Chapter 3",
 *     "questionLanguage": "English", "answerLanguage": "Dutch",
 *     "items": [
 *       { "question": "house", "answer": ["huis", "woning"], "remark": "het huis",
 *         "checked": true,
 *         "stats": { "testCount": 3, "correctCount": 2, "errors": 1, "consecutiveCorrect": 2 } }
 *     ],
 *     "results": [{ "date": 1791549077238, "asked": 10, "correct": 8, "bonus": 2, "percent": 80 }]
 *   }
 *
 * `question` and `answer` accept a string or an array of alternatives.
 * `checked`, `stats` and `results` are optional; invalid values are ignored
 * rather than rejected, since they only carry progress.
 */
export function parseQuizJson(text: string, fileName: string): Quiz {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new QuizParseError('errors.jsonInvalid');
  }
  if (!isRecord(data) || !Array.isArray(data['items'])) {
    throw new QuizParseError('errors.jsonNoItemsArray');
  }

  const items: QuizItem[] = data['items'].map((raw: unknown, index: number) => {
    if (!isRecord(raw)) {
      throw new QuizParseError('errors.jsonBadItem', { index: index + 1 });
    }
    const questions = toStringList(raw['question']);
    const answers = toStringList(raw['answer']);
    if (questions.length === 0 || answers.length === 0) {
      throw new QuizParseError('errors.jsonBadItem', { index: index + 1 });
    }
    return {
      id: String(index),
      questions,
      answers,
      remark: optionalString(raw['remark']),
      checked: raw['checked'] === true,
      stats: toStats(raw['stats']),
    };
  });

  if (items.length === 0) {
    throw new QuizParseError('errors.noItems');
  }

  return {
    id: crypto.randomUUID(),
    title: optionalString(data['title']) ?? titleFromFileName(fileName),
    questionLanguage: optionalString(data['questionLanguage']),
    answerLanguage: optionalString(data['answerLanguage']),
    fileName,
    createdAt: Date.now(),
    items,
    results: toResults(data['results']),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function toStats(value: unknown): ItemStats {
  if (!isRecord(value)) {
    return emptyStats();
  }
  const stats: ItemStats = {
    testCount: count(value['testCount']),
    correctCount: count(value['correctCount']),
    errors: count(value['errors']),
    consecutiveCorrect: count(value['consecutiveCorrect']),
  };
  if (count(value['lastTested']) > 0) {
    stats.lastTested = count(value['lastTested']);
  }
  return stats;
}

function toResults(value: unknown): TestResult[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).flatMap((r) => {
    const result = {
      date: count(r['date']),
      asked: count(r['asked']),
      correct: count(r['correct']),
      bonus: typeof r['bonus'] === 'number' && Number.isInteger(r['bonus']) ? r['bonus'] : 0,
      percent: Math.min(100, count(r['percent'])),
    };
    return result.date > 0 && result.asked > 0 ? [result] : [];
  });
}
