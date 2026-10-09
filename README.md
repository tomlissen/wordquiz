# Word Quizzer

Upload a JSON word list and get quizzed. Everything runs in the browser: lists and progress are kept in `localStorage`, and nothing is sent to a server.

## Running

```bash
npm install     # npm 10 hits a resolver bug with vitest's peer deps; use `npx npm@11 install` if it fails
npm start       # http://localhost:4200
npm test        # unit tests (Vitest)
npm run build   # static site in dist/word-quizzer/browser
```

The app uses hash URLs (`#/quiz/…`), so the build can be served from any static host as is.

## Quiz files

Quizzes are JSON:

```json
{
  "title": "European capitals",
  "questionLanguage": "Country",
  "answerLanguage": "Capital",
  "items": [
    { "question": "Belgium", "answer": ["Brussels", "Brussel"], "remark": "optional note" }
  ]
}
```

`question` and `answer` may be a string or a list of accepted alternatives. Samples are in `public/samples/`.

*Export JSON* writes the same format plus your progress: per item `checked` and `stats` (`testCount`, `correctCount`, `errors`, `consecutiveCorrect`), and the `results` history. Importing an export brings the progress back. These fields are optional, and invalid values in them are ignored.

## Creating and editing quizzes

*New quiz* in the library starts an empty quiz; *Edit* opens an existing one. Everything is editable in place and saved when you leave a field or press Enter:

- the title and the names of the question and answer columns (for example English and Dutch)
- each row's question, answer and note; separate alternatives with a semicolon, like `de kat; de poes`
- rows can be added and deleted. Enter in a question jumps to its answer, and Enter in the last answer adds a new row.

*Add several questions* opens a window to paste a whole list: one question per line, with the question and answer separated by a tab (as when pasting from a spreadsheet), `=` or ` - `, and an optional third part as the note. A preview shows what will be added and which lines are skipped.

Rows without both a question and an answer are kept, but left out of tests and exports until you complete them.

## Test settings

The test screen has these settings:

| Setting | Options |
| --- | --- |
| Question list | all, answered wrong before, checked items, hardest N, random sample of N, new, leave out known (4× right in a row) |
| Questions | question → answer, answer → question, both |
| Order | as entered, back to front, shuffled |
| Test type | presentation, type the answer, puzzle, multiple choice (look-alikes / random), practice without typing, dictation, The English Teacher |
| Repetition | none, repeat the list, repeat until all correct, interval training |
| Checking | ignore capitals, punctuation errors, numbers, word order, accents |

**Interval training** is a simplified Pimsleur graduated-interval recall. A right answer brings the question back after 3, 7, then 15 other questions. A wrong answer brings it back after 2 and resets its streak. After 4 right in a row the question is done.

**Scoring**: a wrong answer that is close earns 1 or 2 bonus points, and every 5 bonus points count as one extra correct answer. Each hint letter costs one bonus point. *My answer was correct* turns the last wrong answer into a right one.

**Reward game**: tick *Flappy Bird* under *Reward game* in the test settings. Every 10 correct answers you get a Flappy Bird break, up to a configurable number of seconds (default 20). The clock starts on your first flap, and a crash ends the break early. Flap with Space, ↑, a click or a tap. *Skip* returns to the quiz at any time.

## Code layout

- `src/app/engine/`: framework-free logic: answer matching, letter diff, scoring, question selection, the repetition scheduler, the test session state machine, and the Flappy Bird physics.
- `src/app/core/`: models, JSON parser and writer, localStorage-backed store.
- `src/app/features/`: library/upload, item list, test screen with one component per test type, and results.
- `public/i18n/`: English and Dutch translations.
