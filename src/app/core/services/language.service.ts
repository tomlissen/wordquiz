import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { readJson, writeJson } from './storage';

export type Language = 'en' | 'nl';
export const LANGUAGES: Language[] = ['en', 'nl'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly current = signal<Language>('en');

  /** Picks the saved or browser language; resolves once its translations are loaded. */
  init(): Observable<unknown> {
    const saved = readJson<Language | null>('lang', null);
    const browser = navigator.language?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
    return this.use(saved && LANGUAGES.includes(saved) ? saved : browser);
  }

  use(lang: Language): Observable<unknown> {
    this.current.set(lang);
    const loaded = this.translate.use(lang);
    document.documentElement.lang = lang;
    try {
      writeJson('lang', lang);
    } catch {
      // Not remembering the language is harmless.
    }
    return loaded;
  }
}
