import { Quiz } from '../model/quiz.model';
import { writeQuizJson } from '../parsers/json-writer';

export function downloadJson(quiz: Quiz): void {
  const blob = new Blob([writeQuizJson(quiz)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quiz.title.replace(/[\\/:*?"<>|]+/g, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
