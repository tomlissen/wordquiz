import { defaultSettings } from '../model/settings.model';
import { SettingsService } from './settings.service';
import { STORAGE_PREFIX } from './storage';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('fills in the reward defaults for settings saved before the reward existed', () => {
    const { reward: _, ...old } = { ...defaultSettings(), testType: 'puzzle' as const };
    localStorage.setItem(`${STORAGE_PREFIX}settings.q1`, JSON.stringify(old));
    const loaded = new SettingsService().load('q1');
    expect(loaded.testType).toBe('puzzle');
    expect(loaded.reward).toEqual({ enabled: false, seconds: 20 });
  });

  it('keeps a saved reward setting', () => {
    const service = new SettingsService();
    service.save('q2', { ...defaultSettings(), reward: { enabled: true, seconds: 30 } });
    expect(service.load('q2').reward).toEqual({ enabled: true, seconds: 30 });
  });
});
