import { isComplete, Quiz, QuizItem } from '../model/quiz.model';

/** Serializes a quiz in the import format, including progress, so an export can be imported again. */
export function writeQuizJson(quiz: Quiz): string {
  const data = {
    title: quiz.title,
    questionLanguage: quiz.questionLanguage,
    answerLanguage: quiz.answerLanguage,
    // Unfinished rows from the editor would make the file fail to import.
    items: quiz.items.filter(isComplete).map(itemToJson),
    results: quiz.results.length ? quiz.results : undefined,
  };
  return JSON.stringify(data, null, 2) + '\n';
}

function itemToJson(item: QuizItem) {
  return {
    question: oneOrMany(item.questions),
    answer: oneOrMany(item.answers),
    remark: item.remark,
    checked: item.checked || undefined,
    stats: item.stats.testCount > 0 ? item.stats : undefined,
  };
}

function oneOrMany(values: string[]): string | string[] {
  return values.length === 1 ? values[0] : values;
}
