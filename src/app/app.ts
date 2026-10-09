import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { QuizStore } from './core/services/quiz-store.service';
import { LanguageSwitcher } from './shared/language-switcher';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe, LanguageSwitcher],
  template: `
    <header class="site-header">
      <a routerLink="/" class="brand">{{ 'app.name' | translate }}</a>
      <app-language-switcher />
    </header>
    @if (store.storageFull()) {
      <p class="banner banner-error" role="alert">{{ 'app.storageFull' | translate }}</p>
    }
    <main>
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(QuizStore);
}
