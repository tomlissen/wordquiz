import { Component, computed, input, linkedSignal, model, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Card } from '../../../core/model/quiz.model';
import { scrambleLetters } from '../../../engine/puzzle';
import { Autofocus } from '../../../shared/autofocus';

/** "Puzzle": the answer's letters are scrambled; click them back in order or type. */
@Component({
  selector: 'app-puzzle-mode',
  imports: [TranslatePipe, Autofocus],
  template: `
    <div class="tiles" role="group" [attr.aria-label]="'test.puzzleHint' | translate">
      @for (letter of tiles(); track $index) {
        <button type="button" class="tile" [disabled]="used().has($index)" (click)="pick($index, letter)">
          {{ letter }}
        </button>
      }
    </div>
    <p class="mode-hint muted">{{ 'test.puzzleHint' | translate }}</p>
    <form class="answer-form" (submit)="$event.preventDefault(); submitted.emit(answer())">
      <label class="visually-hidden" for="answer">{{ 'test.yourAnswer' | translate }}</label>
      <input
        id="answer"
        class="answer-line"
        type="text"
        appAutofocus
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        [value]="answer()"
        (input)="answer.set($any($event.target).value)"
      />
      <div class="actions">
        <button type="submit" class="btn btn-primary">{{ 'test.check' | translate }}</button>
        <button type="button" class="btn" (click)="clear()">{{ 'test.clear' | translate }}</button>
        <button type="button" class="btn btn-quiet" (click)="hint.emit()" [title]="'test.hintCost' | translate">
          {{ 'test.hint' | translate }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .tiles {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0.25rem 0 0.5rem;
    }
    .tile {
      font-family: var(--mono);
      font-size: 1.25rem;
      min-width: 2.4rem;
      height: 2.4rem;
      border: 2px solid var(--ink);
      border-radius: 4px;
      background: var(--sheet);
      color: var(--ink);
      cursor: pointer;
      box-shadow: 0 2px 0 var(--ink);
    }
    .tile:hover:not(:disabled) {
      background: #e8eef7;
    }
    .tile:disabled {
      opacity: 0.25;
      box-shadow: none;
      cursor: default;
    }
  `,
})
export class PuzzleMode {
  readonly card = input.required<Card>();
  /** Changes per question asked, also when the same card comes back. */
  readonly askId = input(0);
  readonly answer = model('');
  readonly submitted = output<string>();
  readonly hint = output<void>();

  protected readonly tiles = computed(() => {
    this.askId();
    return scrambleLetters(this.card().accepted[0], Math.random);
  });
  protected readonly used = linkedSignal(() => {
    this.tiles();
    return new Set<number>();
  });

  protected pick(index: number, letter: string): void {
    this.used.update((s) => new Set(s).add(index));
    this.answer.update((a) => a + letter);
  }

  protected clear(): void {
    this.used.set(new Set());
    this.answer.set('');
  }
}
