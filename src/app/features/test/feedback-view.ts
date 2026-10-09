import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Feedback } from '../../engine/test-session';
import { Autofocus } from '../../shared/autofocus';
import { AnswerDiff } from './answer-diff';

/** Shown after a wrong answer: the teacher's correction, then Next. */
@Component({
  selector: 'app-feedback-view',
  imports: [TranslatePipe, Autofocus, AnswerDiff],
  template: `
    @let f = feedback();
    <div class="feedback" role="status">
      @if (f.overridden) {
        <p class="verdict ok">✓ {{ 'test.overridden' | translate }}</p>
        <p class="model-answer">{{ f.expected }}</p>
      } @else {
        <p class="verdict wrong">{{ 'test.wrong' | translate }}</p>
        <p class="label">{{ 'test.correctAnswer' | translate }}</p>
        @if (f.diff.length) {
          <app-answer-diff [parts]="f.diff" />
        } @else {
          <p class="model-answer">{{ f.expected }}</p>
        }
        @if (f.given) {
          <p class="typed muted">
            {{ 'test.youTyped' | translate }}: <span class="mono">{{ f.given }}</span>
          </p>
        }
        @if (f.bonus > 0) {
          <p class="bonus">{{ 'test.bonusEarned' | translate: { bonus: f.bonus } }}</p>
        }
      }
      @if (f.card.accepted.length > 1) {
        <p class="muted alternatives">{{ f.card.accepted.join(' / ') }}</p>
      }
      @if (f.card.remark) {
        <p class="remark"><strong>{{ 'test.remark' | translate }}:</strong> {{ f.card.remark }}</p>
      }
      <div class="actions">
        <button type="button" class="btn btn-primary" appAutofocus (click)="continued.emit()">
          {{ 'test.next' | translate }}
        </button>
        @if (canOverride() && !f.overridden) {
          <button type="button" class="btn btn-quiet" (click)="override.emit()">
            {{ 'test.actuallyCorrect' | translate }}
          </button>
        }
      </div>
      <p class="muted continue-hint">{{ 'test.continueHint' | translate }}</p>
    </div>
  `,
  styles: `
    .verdict {
      margin: 0.5rem 0 0.25rem;
      font-weight: 800;
      font-size: 1.1rem;
    }
    .verdict.wrong {
      color: var(--red-pen);
    }
    .verdict.ok {
      color: var(--green);
    }
    .label {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ink-soft);
    }
    .typed {
      margin: 0.5rem 0 0;
    }
    .mono {
      font-family: var(--mono);
      color: var(--ink);
    }
    .bonus {
      margin: 0.25rem 0 0;
      color: var(--green);
      font-size: 0.9rem;
    }
    .alternatives {
      margin: 0.25rem 0 0;
    }
    .continue-hint {
      font-size: 0.8rem;
      margin: 0.5rem 0 0;
    }
  `,
})
export class FeedbackView {
  readonly feedback = input.required<Feedback>();
  readonly canOverride = input(true);
  readonly continued = output<void>();
  readonly override = output<void>();
}
