import { Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Card } from '../../../core/model/quiz.model';
import { Autofocus } from '../../../shared/autofocus';

/** "Practice without typing": think of the answer, reveal it, and say whether you knew it. */
@Component({
  selector: 'app-mental-mode',
  imports: [TranslatePipe, Autofocus],
  template: `
    @if (revealed()) {
      <p class="model-answer" aria-live="polite">{{ card().accepted.join(' / ') }}</p>
      @if (card().remark) {
        <p class="remark"><strong>{{ 'test.remark' | translate }}:</strong> {{ card().remark }}</p>
      }
      <div class="actions">
        <button type="button" class="btn btn-primary" appAutofocus (click)="assessed.emit(true)">
          {{ 'test.knewIt' | translate }}
        </button>
        <button type="button" class="btn" (click)="assessed.emit(false)">{{ 'test.didntKnow' | translate }}</button>
      </div>
    } @else {
      <div class="actions">
        <button type="button" class="btn btn-primary" appAutofocus (click)="revealed.set(true)">
          {{ 'test.showAnswer' | translate }}
        </button>
      </div>
    }
  `,
})
export class MentalMode {
  readonly card = input.required<Card>();
  /** Changes per question asked, also when the same card comes back. */
  readonly askId = input(0);
  readonly assessed = output<boolean>();
  protected readonly revealed = linkedSignal(() => {
    this.askId();
    return false;
  });
}
