import { Component, ElementRef, inject, input, signal } from '@angular/core';

let nextId = 0;

/** An (i) button that explains something; opens on hover, focus or tap. */
@Component({
  selector: 'app-info-tip',
  host: {
    '(mouseenter)': 'open.set(true)',
    '(mouseleave)': 'open.set(false)',
    '(document:click)': 'closeOutside($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="icon"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="tipId"
      [attr.aria-expanded]="open()"
      (focus)="open.set(true)"
      (blur)="open.set(false)"
      (click)="open.set(true)"
    >
      i
    </button>
    <span class="tip" role="tooltip" [id]="tipId" [class.open]="open()">{{ text() }}</span>
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      vertical-align: middle;
    }
    .icon {
      display: inline-grid;
      place-items: center;
      width: 1.15rem;
      height: 1.15rem;
      margin-left: 0.3rem;
      padding: 0;
      border: 1.5px solid var(--ink-soft);
      border-radius: 50%;
      background: var(--sheet);
      color: var(--ink-soft);
      font: italic 700 0.75rem/1 Georgia, serif;
      cursor: help;
    }
    .icon:hover,
    .icon[aria-expanded='true'] {
      border-color: var(--ink);
      color: var(--ink);
    }
    .tip {
      position: absolute;
      z-index: 10;
      top: calc(100% + 0.4rem);
      left: 50%;
      transform: translateX(-50%);
      width: max-content;
      max-width: min(20rem, 80vw);
      padding: 0.6rem 0.8rem;
      background: var(--ink);
      color: var(--sheet);
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 400;
      line-height: 1.45;
      text-align: left;
      white-space: normal;
      visibility: hidden;
    }
    .tip.open {
      visibility: visible;
    }
  `,
})
export class InfoTip {
  readonly text = input.required<string>();
  /** Accessible name of the button, e.g. "About notes". */
  readonly label = input.required<string>();

  protected readonly open = signal(false);
  protected readonly tipId = `info-tip-${nextId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
