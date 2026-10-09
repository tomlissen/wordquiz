import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/** Focuses the element once it is rendered, so the test can be done with the keyboard only. */
@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => el.nativeElement.focus({ preventScroll: true }));
  }
}
