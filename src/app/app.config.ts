import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeNl from '@angular/common/locales/nl';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { LanguageService } from './core/services/language.service';

registerLocaleData(localeNl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs so the app works on any static host without rewrite rules.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
    provideHttpClient(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './i18n/', suffix: '.json' }),
      fallbackLang: 'en',
    }),
    provideAppInitializer(() => firstValueFrom(inject(LanguageService).init()).catch(() => undefined)),
  ],
};
