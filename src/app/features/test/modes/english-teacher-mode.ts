import { Component, input, model, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Card } from '../../../core/model/quiz.model';
import { MatchOptions } from '../../../core/model/settings.model';
import { checkAnswer, isPrefixOfAnswer } from '../../../engine/answer-matcher';
import { Autofocus } from '../../../shared/autofocus';

/** "The English Teacher": the first wrong keystroke fails the card; a complete answer is accepted at once. */
@Component({
  selector: 'app-english-teacher-mode',
  imports: [TranslatePipe, Autofocus],
  template: `
    <p class="mode-hint muted">{{ 'test.englishTeacherHint' | translate }}</p>
    <form class="answer-form" (submit)="$event.preventDefault(); onSubmit(field.value)">
      <label class="visually-hidden" for="answer">{{ 'test.yourAnswer' | translate }}</label>
      <input
        #field
        id="answer"
        class="answer-line"
        type="text"
        appAutofocus
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        [value]="answer()"
        (input)="onInput(field.value)"
        (paste)="$event.preventDefault()"
      />
    </form>
  `,
})
export class EnglishTeacherMode {
  readonly card = input.required<Card>();
  readonly match = input.required<MatchOptions>();
  readonly answer = model('');
  readonly submitted = output<string>();
  readonly failed = output<string>();

  protected onInput(value: string): void {
    this.answer.set(value);
    const { accepted } = this.card();
    if (!isPrefixOfAnswer(value, accepted, this.match())) {
      this.failed.emit(value);
    } else if (checkAnswer(value, accepted, this.match()).correct && !this.isPrefixOfLongerAnswer(value)) {
      this.submitted.emit(value);
    }
  }

  protected onSubmit(value: string): void {
    if (checkAnswer(value, this.card().accepted, this.match()).correct) {
      this.submitted.emit(value);
    } else {
      this.failed.emit(value);
    }
  }

  /** "de kat" vs "de kater": wait for Enter when the typed text could still grow into another answer. */
  private isPrefixOfLongerAnswer(value: string): boolean {
    const longer = this.card().accepted.filter((a) => !checkAnswer(value, [a], this.match()).correct);
    return longer.length > 0 && isPrefixOfAnswer(value, longer, this.match());
  }
}
