// Bundles every quiz in quizzes/ into .generated/built-in-quizzes.json, which
// the app serves as /built-in-quizzes.json. Runs before `npm start` and
// `npm run build`; run it yourself with `npm run quizzes`.
//
// Progress from an app export (results, and per item stats and checked) is
// left out, so a built-in quiz always starts fresh. The files themselves are
// not changed.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'quizzes');
const outFile = join(root, '.generated', 'built-in-quizzes.json');

const errors = [];
const quizzes = [];
const withProgress = [];

/** Drops results, and stats/checked per item; returns null if there was nothing to drop. */
function withoutProgress(data) {
  const { results, ...rest } = data;
  let dropped = results !== undefined;
  const items = data.items.map(({ stats, checked, ...item }) => {
    dropped ||= stats !== undefined || checked !== undefined;
    return item;
  });
  return dropped ? { ...rest, items } : null;
}

for (const file of readdirSync(sourceDir).filter((f) => f.endsWith('.json')).sort()) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(sourceDir, file), 'utf8'));
  } catch (e) {
    errors.push(`${file}: not valid JSON (${e.message})`);
    continue;
  }
  if (!Array.isArray(data?.items) || data.items.length === 0) {
    errors.push(`${file}: needs a non-empty "items" list`);
    continue;
  }
  const filled = (v) => (Array.isArray(v) ? v.some(filled) : (typeof v === 'string' && v.trim()) || typeof v === 'number');
  const bad = data.items.findIndex((item) => !filled(item?.question) || !filled(item?.answer));
  if (bad !== -1) {
    errors.push(`${file}: item ${bad + 1} needs a "question" and an "answer"`);
    continue;
  }
  const cleaned = withoutProgress(data);
  if (cleaned) {
    withProgress.push(file);
    data = cleaned;
  }
  quizzes.push({
    id: basename(file, '.json'),
    file,
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : basename(file, '.json'),
    questionLanguage: data.questionLanguage,
    answerLanguage: data.answerLanguage,
    count: data.items.length,
    data,
  });
}

if (errors.length) {
  console.error(`Built-in quizzes in quizzes/ have problems:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

quizzes.sort((a, b) => a.title.localeCompare(b.title));
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ quizzes }));
console.log(`Built-in quizzes: ${quizzes.length} (${quizzes.map((q) => q.file).join(', ') || 'none'})`);
if (withProgress.length) {
  console.log(`Left out progress (stats, checked, results) from: ${withProgress.join(', ')}`);
}
