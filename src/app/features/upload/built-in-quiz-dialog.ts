import { Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** One entry of built-in-quizzes.json, generated from quizzes/ by scripts/build-quiz-index.mjs. */
export interface BuiltInQuiz {
  id: string;
  file: string;
  title: string;
  questionLanguage?: string;
  answerLanguage?: string;
  count: number;
  data: unknown;
}

export const BUILT_IN_QUIZZES_URL = './built-in-quizzes.json';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** Lists the quizzes that ship with the app; each can be added to your own list. */
@Component({
  selector: 'app-built-in-quiz-dialog',
  imports: [TranslatePipe],
  templateUrl: './built-in-quiz-dialog.html',
  styleUrl: './built-in-quiz-dialog.scss',
})
export class BuiltInQuizDialog {
  /** The chosen quiz as file text, so it is imported exactly like an uploaded file. */
  readonly picked = output<{ fileName: string; text: string }>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly state = signal<LoadState>('idle');
  protected readonly quizzes = signal<BuiltInQuiz[]>([]);
  /** Added while the window is open, so a quiz isn't added twice by accident. */
  protected readonly added = signal(new Set<string>());

  open(): void {
    this.added.set(new Set());
    this.dialog().nativeElement.showModal();
    if (this.state() !== 'loaded') {
      this.load();
    }
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected add(quiz: BuiltInQuiz): void {
    this.picked.emit({ fileName: quiz.file, text: JSON.stringify(quiz.data) });
    this.added.update((set) => new Set(set).add(quiz.id));
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  private async load(): Promise<void> {
    this.state.set('loading');
    try {
      const response = await fetch(BUILT_IN_QUIZZES_URL);
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const body = (await response.json()) as { quizzes?: BuiltInQuiz[] };
      this.quizzes.set(Array.isArray(body.quizzes) ? body.quizzes : []);
      this.state.set('loaded');
    } catch {
      this.state.set('error');
    }
  }
}
