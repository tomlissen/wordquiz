import { afterNextRender, Component, computed, inject, Injector, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { isComplete, KNOWN_STREAK, QuizItem } from '../../core/model/quiz.model';
import { NewItem, QuizStore } from '../../core/services/quiz-store.service';
import { InfoTip } from '../../shared/info-tip';
import { joinAlternatives, splitAlternatives } from './alternatives';
import { BulkAddDialog } from './bulk-add-dialog';

/**
 * Filter rule: text matches anywhere in question or answer; a
 * pattern written as ^…$ is a regular expression.
 */
export function itemFilter(filter: string): (item: QuizItem) => boolean {
  const f = filter.trim();
  if (!f) {
    return () => true;
  }
  let test: (s: string) => boolean;
  if (f.startsWith('^') && f.endsWith('$') && f.length > 1) {
    try {
      const re = new RegExp(f, 'iu');
      test = (s) => re.test(s);
    } catch {
      return () => false;
    }
  } else {
    const needle = f.toLocaleLowerCase();
    test = (s) => s.toLocaleLowerCase().includes(needle);
  }
  return (item) => [...item.questions, ...item.answers].some(test);
}

type Field = 'questions' | 'answers';

@Component({
  selector: 'app-quiz-editor-page',
  imports: [RouterLink, TranslatePipe, InfoTip, BulkAddDialog],
  templateUrl: './quiz-editor-page.html',
  styleUrl: './quiz-editor-page.scss',
})
export class QuizEditorPage {
  private readonly store = inject(QuizStore);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);

  readonly id = input.required<string>();
  protected readonly filter = signal('');
  /** How many questions the last paste added, for the confirmation line. */
  protected readonly bulkAdded = signal(0);
  protected readonly knownStreak = KNOWN_STREAK;
  protected readonly join = joinAlternatives;

  protected readonly quiz = computed(() => this.store.quizzes().find((q) => q.id === this.id()));
  protected readonly visible = computed(() => (this.quiz()?.items ?? []).filter(itemFilter(this.filter())));
  protected readonly checkedCount = computed(() => (this.quiz()?.items ?? []).filter((i) => i.checked).length);
  protected readonly incompleteCount = computed(
    () => (this.quiz()?.items ?? []).filter((i) => !isComplete(i)).length,
  );

  constructor() {
    // A brand-new quiz: start by naming it.
    afterNextRender(() => {
      const items = this.quiz()?.items ?? [];
      if (items.length === 1 && !items[0].questions.length && !items[0].answers.length) {
        const title = document.getElementById('quiz-title') as HTMLInputElement | null;
        title?.focus();
        title?.select();
      }
    });
  }

  protected isComplete(item: QuizItem): boolean {
    return isComplete(item);
  }

  protected saveTitle(input: HTMLInputElement): void {
    const title = input.value.trim();
    if (title) {
      this.store.updateDetails(this.id(), { title });
    } else {
      input.value = this.quiz()?.title ?? '';
    }
  }

  protected saveLabel(key: 'questionLanguage' | 'answerLanguage', value: string): void {
    this.store.updateDetails(this.id(), { [key]: value.trim() || undefined });
  }

  protected saveAlternatives(item: QuizItem, field: Field, value: string): void {
    const values = splitAlternatives(value);
    if (joinAlternatives(values) !== joinAlternatives(item[field])) {
      this.store.updateItem(this.id(), item.id, { [field]: values });
    }
  }

  protected saveRemark(item: QuizItem, value: string): void {
    this.store.updateItem(this.id(), item.id, { remark: value.trim() || undefined });
  }

  /** Enter in a question goes to its answer; Enter in the last answer starts a new row. */
  protected onEnter(event: Event, item: QuizItem, field: Field): void {
    event.preventDefault();
    (event.target as HTMLInputElement).blur(); // commits the value through (change)
    if (field === 'questions') {
      this.focus(`a-${item.id}`);
      return;
    }
    // Saving just replaced the item object in the store, so find the row by id.
    const rows = this.visible();
    const next = rows[rows.findIndex((r) => r.id === item.id) + 1];
    if (next) {
      this.focus(`q-${next.id}`);
    } else {
      this.addItem(item.id);
    }
  }

  protected addItem(afterItemId?: string): void {
    this.filter.set(''); // a new, empty row would not match any filter
    const id = this.store.addItem(this.id(), afterItemId);
    this.focus(`q-${id}`);
  }

  protected addMany(items: NewItem[]): void {
    this.filter.set('');
    this.store.addItems(this.id(), items);
    this.bulkAdded.set(items.length);
  }

  protected removeItem(item: QuizItem): void {
    this.store.removeItem(this.id(), item.id);
  }

  protected toggle(item: QuizItem): void {
    this.store.setChecked(this.id(), new Set([item.id]), !item.checked);
  }

  protected setVisible(checked: boolean): void {
    this.store.setChecked(this.id(), new Set(this.visible().map((i) => i.id)), checked);
  }

  protected resetStats(): void {
    if (confirm(this.translate.instant('editor.confirmReset'))) {
      this.store.resetStats(this.id());
    }
  }

  private focus(elementId: string): void {
    afterNextRender(() => document.getElementById(elementId)?.focus(), { injector: this.injector });
  }
}
