import { Component, input, output } from '@angular/core';

/** "Multiple choice": click an option, or press its number. */
@Component({
  selector: 'app-multiple-choice-mode',
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <ol class="options">
      @for (option of options(); track option; let i = $index) {
        <li>
          <button
            type="button"
            class="option"
            (click)="chosen.emit(option)"
            [attr.aria-keyshortcuts]="i + 1"
          >
            <span class="key" aria-hidden="true">{{ i + 1 }}</span>
            <span class="text">{{ option }}</span>
          </button>
        </li>
      }
    </ol>
  `,
  styles: `
    .options {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    .option {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      width: 100%;
      text-align: left;
      font: inherit;
      font-size: 1.2rem;
      padding: 0.6rem 0.9rem;
      border: 2px solid var(--ink);
      border-radius: 6px;
      background: var(--sheet);
      color: var(--ink);
      cursor: pointer;
    }
    .option:hover {
      background: #e8eef7;
    }
    .key {
      font-family: var(--mono);
      font-size: 0.9rem;
      color: var(--ink-soft);
    }
    .text {
      font-family: var(--mono);
      overflow-wrap: anywhere;
    }
  `,
})
export class MultipleChoiceMode {
  readonly options = input.required<string[]>();
  readonly chosen = output<string>();

  protected onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select') || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const n = Number(event.key);
    const option = this.options()[n - 1];
    if (Number.isInteger(n) && option !== undefined) {
      event.preventDefault();
      this.chosen.emit(option);
    }
  }
}
