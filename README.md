# Word Quizzer

Upload a JSON word list and get quizzed. Everything runs in the browser: lists and progress are kept in `localStorage`, and nothing is sent to a server.

## Running

```bash
npm install     # npm 10 hits a resolver bug with vitest's peer deps; use `npx npm@11 install` if it fails
npm start       # http://localhost:4200
npm test        # unit tests (Vitest)
npm run build   # static site in dist/word-quizzer/browser
npm run deploy  # build and publish to GitHub Pages
```

The app uses hash URLs (`#/quiz/…`), so the build can be served from any static host as is.

## Deploying to GitHub Pages

The app is published at **https://tomlissen.github.io/wordquiz/**. It is served from the `gh-pages` branch of [tomlissen/wordquiz](https://github.com/tomlissen/wordquiz), which [angular-cli-ghpages](https://github.com/angular-schule/angular-cli-ghpages) maintains; never edit that branch by hand.

### Publishing a new version

```bash
npm run deploy
```

This runs three steps:

1. `npm run quizzes` regenerates the list of built-in quizzes from `quizzes/`, and stops if a quiz file is broken.
2. `ng deploy` makes a production build with base href `/wordquiz/` into `dist/word-quizzer/browser`.
3. angular-cli-ghpages commits that folder to `gh-pages` ("Auto-generated commit") and pushes it to `origin`. The branch's previous contents are replaced, and a `.nojekyll` and a `404.html` are added.

GitHub Pages usually shows the new version within a minute or two. Reload with Ctrl+Shift+R if you still see the old one.

To check what would be published without pushing anything:

```bash
npm run deploy -- --dry-run
```

### Things to keep in mind

- **Use `npm run deploy`, not `ng deploy`.** `ng deploy` builds the app itself and skips the npm scripts, so it would publish whatever list of built-in quizzes happened to be left in `.generated/`: outdated, or missing on a fresh checkout.
- **Deploying doesn't push your source code.** It only publishes the built site. Push `main` separately with `git push`.
- **Base href.** The site lives under `/wordquiz/`, so the deploy target in `angular.json` sets `"baseHref": "/wordquiz/"`. Change it if the repository is renamed; with a custom domain it becomes `"/"`. `npm start` and `npm run build` keep using `/`.
- **Pushing needs SSH access** to `git@github.com:tomlissen/wordquiz.git`, using your local git name and email for the commit.
- **One-time GitHub setting:** under *Settings → Pages*, the source must be *Deploy from a branch*, with branch `gh-pages` and folder `/ (root)`.
- **Your quizzes don't move along.** Everything is stored in the browser's `localStorage`, per site, so the deployed app starts empty, separate from `localhost`. To move quizzes, use *Export JSON* on one and import the file on the other.

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

`question` and `answer` may be a string or a list of accepted alternatives.

### Built-in quizzes

Every `.json` file in `quizzes/` is offered under *Choose a built-in quiz* on the start page. To add one, drop a file in that folder and restart `npm start`. An *Export JSON* file from the app works too: its progress (`stats`, `checked`, `results`) is left out of the bundled version, so a built-in quiz always starts fresh. The file itself isn't changed.

`scripts/build-quiz-index.mjs` bundles the folder into `.generated/built-in-quizzes.json`, which is served as `/built-in-quizzes.json`. It runs automatically before `npm start`, `npm run build`, `npm run watch` and `npm run deploy`. Run it yourself with `npm run quizzes`. A file that isn't valid JSON, or has an item without a question or answer, stops the build with the file name and the problem. See [Deploying](#deploying-to-github-pages) for why deploys must go through `npm run deploy`.

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
