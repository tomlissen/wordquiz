import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DiffPart } from '../../engine/diff';

/** The correct answer as the teacher corrects it: wrong letters red, missing green, extra blue. */
@Component({
  selector: 'app-answer-diff',
  imports: [TranslatePipe],
  template: `
    <span class="diff">
      @for (part of parts(); track $index) {
        <span [class]="part.kind" [attr.title]="'test.legend.' + part.kind | translate">{{ part.char }}</span>
      }
    </span>
    <span class="legend">
      <span class="wrong">{{ 'test.legend.wrong' | translate }}</span>
      <span class="missing">{{ 'test.legend.missing' | translate }}</span>
      <span class="extra">{{ 'test.legend.extra' | translate }}</span>
    </span>
  `,
  styles: `
    :host {
      display: block;
    }
    .diff {
      font-family: var(--mono);
      font-size: 1.5rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .ok {
      color: var(--ink);
    }
    .wrong {
      color: var(--red-pen);
      font-weight: 600;
      text-decoration: underline wavy;
      text-underline-offset: 0.2em;
    }
    .missing {
      color: var(--green);
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    .extra {
      color: var(--blue);
      text-decoration: line-through;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      margin-top: 0.25rem;
      font-size: 0.8rem;
    }
  `,
})
export class AnswerDiff {
  readonly parts = input.required<DiffPart[]>();
}
