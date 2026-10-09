/** Vragenlijst: which items take part in the test. */
export type QuestionSelection =
  | 'all'
  | 'everWrong'
  | 'checked'
  | 'hardest'
  | 'sample'
  | 'new'
  | 'skipKnown';

/** Vraagstelling: question → answer, answer → question, or both. */
export type Direction = 'forward' | 'reverse' | 'both';

/** Volgorde. */
export type Order = 'asEntered' | 'reversed' | 'shuffled';

/** Overhoortype. */
export type TestType =
  | 'presentation'
  | 'asEntered'
  | 'puzzle'
  | 'mcSimilar'
  | 'mcRandom'
  | 'mental'
  | 'dictation'
  | 'englishTeacher';

/** Herhaling. */
export type Repetition = 'none' | 'repeatList' | 'untilAllCorrect' | 'interval';

/** Controle. */
export interface MatchOptions {
  ignoreCase: boolean;
  ignorePunctuation: boolean;
  ignoreNumbers: boolean;
  anyWordOrder: boolean;
  ignoreAccents: boolean;
}

/** Flappy Bird break after every REWARD_EVERY correct answers. */
export interface RewardSettings {
  enabled: boolean;
  /** Maximum length of a break; a crash ends it earlier. */
  seconds: number;
}

export const REWARD_EVERY = 10;
export const REWARD_MIN_SECONDS = 5;
export const REWARD_MAX_SECONDS = 120;

export interface TestSettings {
  selection: QuestionSelection;
  /** N for the "hardest top N" and "random sample of N" selections. */
  selectionCount: number;
  direction: Direction;
  order: Order;
  testType: TestType;
  repetition: Repetition;
  match: MatchOptions;
  reward: RewardSettings;
}

export const QUESTION_SELECTIONS: QuestionSelection[] = [
  'all', 'everWrong', 'checked', 'hardest', 'sample', 'new', 'skipKnown',
];
export const DIRECTIONS: Direction[] = ['forward', 'reverse', 'both'];
export const ORDERS: Order[] = ['asEntered', 'reversed', 'shuffled'];
export const TEST_TYPES: TestType[] = [
  'presentation', 'asEntered', 'puzzle', 'mcSimilar', 'mcRandom', 'mental', 'dictation', 'englishTeacher',
];
export const REPETITIONS: Repetition[] = ['none', 'repeatList', 'untilAllCorrect', 'interval'];
export const MATCH_OPTION_KEYS: (keyof MatchOptions)[] = [
  'ignoreCase', 'ignorePunctuation', 'ignoreNumbers', 'anyWordOrder', 'ignoreAccents',
];

export function defaultSettings(): TestSettings {
  return {
    selection: 'all',
    selectionCount: 10,
    direction: 'forward',
    order: 'shuffled',
    testType: 'asEntered',
    repetition: 'none',
    match: {
      ignoreCase: false,
      ignorePunctuation: false,
      ignoreNumbers: false,
      anyWordOrder: false,
      ignoreAccents: false,
    },
    reward: { enabled: false, seconds: 20 },
  };
}
