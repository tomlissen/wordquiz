import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LANGUAGES, LanguageService } from '../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  template: `
    <div class="switch" role="group" [attr.aria-label]="'app.language' | translate">
      @for (lang of languages; track lang) {
        <button
          type="button"
          [class.active]="lang === language.current()"
          [attr.aria-pressed]="lang === language.current()"
          (click)="language.use(lang)"
        >
          {{ lang.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: `
    .switch {
      display: inline-flex;
      border: 2px solid var(--ink);
      border-radius: 6px;
      overflow: hidden;
    }
    button {
      font: inherit;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.25rem 0.6rem;
      border: 0;
      background: var(--sheet);
      color: var(--ink);
      cursor: pointer;
    }
    button.active {
      background: var(--ink);
      color: var(--sheet);
    }
  `,
})
export class LanguageSwitcher {
  protected readonly language = inject(LanguageService);
  protected readonly languages = LANGUAGES;
}
