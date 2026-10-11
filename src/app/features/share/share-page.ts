import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Quiz } from '../../core/model/quiz.model';
import { QuizStore } from '../../core/services/quiz-store.service';
import { decodeQuiz } from '../../core/services/share-link';
import { Autofocus } from '../../shared/autofocus';

const PREVIEW_COUNT = 5;

type State = { kind: 'loading' } | { kind: 'ready'; quiz: Quiz } | { kind: 'broken' };

/** Opened from a share link: shows the quiz and adds it only when asked. */
@Component({
  selector: 'app-share-page',
  imports: [RouterLink, TranslatePipe, Autofocus],
  templateUrl: './share-page.html',
  styleUrl: './share-page.scss',
})
export class SharePage {
  private readonly store = inject(QuizStore);
  private readonly router = inject(Router);

  /** The code after #/share/, bound from the route. */
  readonly data = input.required<string>();

  protected readonly state = signal<State>({ kind: 'loading' });
  protected readonly previewCount = PREVIEW_COUNT;
  protected readonly alreadyHave = computed(() => {
    const s = this.state();
    return s.kind === 'ready' && this.store.quizzes().some((q) => q.title === s.quiz.title);
  });

  constructor() {
    effect(() => {
      const code = this.data();
      this.state.set({ kind: 'loading' });
      decodeQuiz(code).then(
        (quiz) => this.state.set({ kind: 'ready', quiz }),
        () => this.state.set({ kind: 'broken' }),
      );
    });
  }

  protected add(quiz: Quiz): void {
    this.store.add({ ...quiz, createdAt: Date.now() });
    this.router.navigate(['/']);
  }
}
