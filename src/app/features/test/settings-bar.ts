import { Component, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  DIRECTIONS,
  MATCH_OPTION_KEYS,
  MatchOptions,
  ORDERS,
  QUESTION_SELECTIONS,
  REPETITIONS,
  REWARD_EVERY,
  REWARD_MAX_SECONDS,
  REWARD_MIN_SECONDS,
  TEST_TYPES,
  TestSettings,
} from '../../core/model/settings.model';

/** The settings strip at the top of the test screen; any change restarts the test. */
@Component({
  selector: 'app-settings-bar',
  imports: [TranslatePipe],
  templateUrl: './settings-bar.html',
  styleUrl: './settings-bar.scss',
  host: {
    '(document:click)': 'closeMatchOutside($event)',
    '(document:keydown.escape)': 'closeMatch()',
  },
})
export class SettingsBar {
  readonly settings = input.required<TestSettings>();
  readonly questionLabel = input<string>();
  readonly answerLabel = input<string>();
  /** Opens the (normally collapsed) settings, e.g. when the chosen question list is empty. */
  readonly forceOpen = input(false);
  readonly changed = output<TestSettings>();

  private readonly details = viewChild.required<ElementRef<HTMLDetailsElement>>('settingsDetails');

  constructor() {
    // Only ever opens: closing again is up to the user.
    effect(() => {
      if (this.forceOpen()) {
        this.details().nativeElement.open = true;
      }
    });
  }

  private readonly matchDetails = viewChild<ElementRef<HTMLDetailsElement>>('matchDetails');

  protected readonly selections = QUESTION_SELECTIONS;
  protected readonly directions = DIRECTIONS;
  protected readonly orders = ORDERS;
  protected readonly testTypes = TEST_TYPES;
  protected readonly repetitions = REPETITIONS;
  protected readonly matchKeys = MATCH_OPTION_KEYS;
  protected readonly rewardEvery = REWARD_EVERY;
  protected readonly rewardMin = REWARD_MIN_SECONDS;
  protected readonly rewardMax = REWARD_MAX_SECONDS;

  protected set<K extends keyof TestSettings>(key: K, value: TestSettings[K]): void {
    this.changed.emit({ ...this.settings(), [key]: value });
  }

  protected setCount(raw: string): void {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n) && n >= 1) {
      this.set('selectionCount', n);
    }
  }

  protected setMatch(key: keyof MatchOptions, value: boolean): void {
    this.set('match', { ...this.settings().match, [key]: value });
  }

  protected setRewardEnabled(enabled: boolean): void {
    this.set('reward', { ...this.settings().reward, enabled });
  }

  protected setRewardSeconds(raw: string): void {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n)) {
      const seconds = Math.min(REWARD_MAX_SECONDS, Math.max(REWARD_MIN_SECONDS, n));
      this.set('reward', { ...this.settings().reward, seconds });
    }
  }

  protected closeMatchOutside(event: Event): void {
    const details = this.matchDetails()?.nativeElement;
    if (details?.open && !details.contains(event.target as Node)) {
      details.open = false;
    }
  }

  protected closeMatch(): void {
    const details = this.matchDetails()?.nativeElement;
    if (details) {
      details.open = false;
    }
  }

  protected activeMatchCount(): number {
    return this.matchKeys.filter((k) => this.settings().match[k]).length;
  }

  protected needsCount(): boolean {
    return this.settings().selection === 'hardest' || this.settings().selection === 'sample';
  }

  protected value(event: Event): string {
    return (event.target as HTMLSelectElement | HTMLInputElement).value;
  }
}
