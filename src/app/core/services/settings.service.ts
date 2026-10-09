import { Injectable } from '@angular/core';
import { defaultSettings, TestSettings } from '../model/settings.model';
import { readJson, writeJson } from './storage';

/** Test settings per quiz; a new quiz starts from the settings last used anywhere. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  load(quizId: string): TestSettings {
    const base = defaultSettings();
    const saved = readJson<Partial<TestSettings> | null>(`settings.${quizId}`, null) ??
      readJson<Partial<TestSettings> | null>('settings.last', null) ?? {};
    return {
      ...base,
      ...saved,
      match: { ...base.match, ...saved.match },
      reward: { ...base.reward, ...saved.reward },
    };
  }

  save(quizId: string, settings: TestSettings): void {
    try {
      writeJson(`settings.${quizId}`, settings);
      writeJson('settings.last', settings);
    } catch {
      // Settings are a convenience; the quiz store reports a full storage.
    }
  }
}
