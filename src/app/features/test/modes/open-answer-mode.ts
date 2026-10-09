import { Component, computed, input, model, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Card } from '../../../core/model/quiz.model';
import { Autofocus } from '../../../shared/autofocus';

/** "As entered" and "Dictation": type the answer on the ruled line. */
@Component({
  selector: 'app-open-answer-mode',
  imports: [TranslatePipe, Autofocus],
  template: `
    @if (dictation()) {
      <p class="model-answer" aria-live="polite">{{ card().accepted[0] }}</p>
      <p class="mode-hint muted">{{ 'test.dictationHint' | translate }}</p>
    }
    <form class="answer-form" (submit)="$event.preventDefault(); send()">
      <label class="visually-hidden" for="answer">{{ 'test.yourAnswer' | translate }}</label>
      @if (multiline()) {
        <textarea
          id="answer"
          class="answer-line"
          rows="3"
          appAutofocus
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          [value]="answer()"
          (input)="answer.set($any($event.target).value)"
          (keydown)="onTextareaKey($event)"
        ></textarea>
        <p class="mode-hint muted">{{ 'test.multiline' | translate }}</p>
      } @else {
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
      }
      <div class="actions">
        <button type="submit" class="btn btn-primary">{{ 'test.check' | translate }}</button>
        @if (!dictation()) {
          <button type="button" class="btn btn-quiet" (click)="hint.emit()" [title]="'test.hintCost' | translate">
            {{ 'test.hint' | translate }}
          </button>
        }
      </div>
    </form>
  `,
})
export class OpenAnswerMode {
  readonly card = input.required<Card>();
  readonly dictation = input(false);
  readonly answer = model('');
  readonly submitted = output<string>();
  readonly hint = output<void>();

  protected readonly multiline = computed(() => this.card().accepted.some((a) => a.includes('\n')));

  protected send(): void {
    this.submitted.emit(this.answer());
  }

  /** Enter checks, Ctrl+Enter adds a line. */
  protected onTextareaKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const el = event.target as HTMLTextAreaElement;
      el.setRangeText('\n', el.selectionStart, el.selectionEnd, 'end');
      this.answer.set(el.value);
    } else {
      this.send();
    }
  }
}
