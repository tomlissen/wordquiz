import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Card, isComplete, Quiz } from '../../core/model/quiz.model';
import { TestSettings } from '../../core/model/settings.model';
import { QuizStore } from '../../core/services/quiz-store.service';
import { SettingsService } from '../../core/services/settings.service';
import { multipleChoiceOptions } from '../../engine/distractors';
import { rewardsDue } from '../../engine/reward';
import { scorePercent } from '../../engine/scoring';
import { buildCards, orderCards, prepareCards } from '../../engine/selection';
import { TestSession } from '../../engine/test-session';
import { Autofocus } from '../../shared/autofocus';
import { ResultsView } from '../results/results-view';
import { FeedbackView } from './feedback-view';
import { EnglishTeacherMode } from './modes/english-teacher-mode';
import { MentalMode } from './modes/mental-mode';
import { MultipleChoiceMode } from './modes/multiple-choice-mode';
import { OpenAnswerMode } from './modes/open-answer-mode';
import { PuzzleMode } from './modes/puzzle-mode';
import { FlappyBreak } from './reward/flappy-break';
import { SettingsBar } from './settings-bar';

@Component({
  selector: 'app-test-page',
  imports: [
    RouterLink,
    TranslatePipe,
    Autofocus,
    SettingsBar,
    FlappyBreak,
    FeedbackView,
    ResultsView,
    OpenAnswerMode,
    PuzzleMode,
    MultipleChoiceMode,
    MentalMode,
    EnglishTeacherMode,
  ],
  templateUrl: './test-page.html',
  styleUrl: './test-page.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class TestPage {
  private readonly store = inject(QuizStore);
  private readonly settingsService = inject(SettingsService);

  readonly id = input.required<string>();

  protected readonly quiz = computed(() => this.store.quizzes().find((q) => q.id === this.id()));
  protected readonly settings = signal<TestSettings | null>(null);
  protected readonly answer = signal('');
  protected readonly restartedNote = signal(false);

  /** The session is a plain mutable object; `version` makes the template re-read it. */
  private session: TestSession | null = null;
  private readonly version = signal(0);
  /** Increments per question asked, so mode components are recreated even when a card repeats. */
  protected readonly askId = signal(0);
  private resultSaved = false;
  private practising = false;
  /** Flappy Bird breaks: how many were earned this session, and whether one waits for the feedback to close. */
  private rewardsGiven = 0;
  private rewardPending = false;
  protected readonly rewardActive = signal(false);

  protected readonly view = computed(() => {
    this.version();
    const s = this.session;
    if (!s) {
      return null;
    }
    return {
      phase: s.phase,
      card: s.current,
      feedback: s.feedback,
      score: { ...s.score },
      percent: scorePercent(s.score),
      scored: s.scored,
      remaining: s.scheduler.remaining,
      round: s.scheduler.round,
      known: s.scheduler.known,
      total: s.scheduler.total,
      repetition: s.scheduler.repetition,
      mistakes: s.mistakeCards,
    };
  });

  /** Drawn once per question asked. */
  protected readonly mcOptions = computed(() => {
    this.askId();
    return untracked(() => {
      const card = this.session?.current;
      const quiz = this.quiz();
      const type = this.settings()?.testType;
      if (!card || !quiz || (type !== 'mcSimilar' && type !== 'mcRandom')) {
        return [];
      }
      const pool = buildCards(quiz.items.filter(isComplete), 'both');
      return multipleChoiceOptions(card, pool, type === 'mcSimilar' ? 'similar' : 'random', Math.random);
    });
  });

  constructor() {
    // Load settings and start once the quiz is known; later store updates (stats) must not restart.
    effect(() => {
      const quiz = this.quiz();
      if (!quiz || untracked(this.settings)) {
        return;
      }
      untracked(() => {
        this.settings.set(this.settingsService.load(quiz.id));
        this.start();
      });
    });
  }

  protected onSettingsChanged(settings: TestSettings): void {
    const answered = (this.session?.score.asked ?? 0) > 0;
    this.saveResult();
    this.settings.set(settings);
    this.settingsService.save(this.id(), settings);
    this.start();
    this.restartedNote.set(answered);
  }

  protected restart(): void {
    this.saveResult();
    this.start();
  }

  protected practiseMistakes(): void {
    const mistakes = this.session?.mistakeCards ?? [];
    if (mistakes.length) {
      this.start(mistakes, true);
    }
  }

  protected stop(): void {
    this.session?.stop();
    this.afterChange();
  }

  protected submit(text: string): void {
    this.session?.submit(text);
    this.afterChange();
  }

  protected choose(option: string): void {
    this.session?.choose(option);
    this.afterChange();
  }

  protected assess(knewIt: boolean): void {
    this.session?.selfAssess(knewIt);
    this.afterChange();
  }

  protected failKeystroke(typed: string): void {
    this.session?.failKeystroke(typed);
    this.afterChange();
  }

  protected advance(): void {
    this.session?.advance();
    this.afterChange();
  }

  protected hint(): void {
    if (this.session) {
      this.answer.set(this.session.hint());
      this.bump();
    }
  }

  protected continue(): void {
    this.session?.continue();
    this.afterChange();
  }

  protected markLastCorrect(): void {
    if (this.session?.markLastCorrect()) {
      this.afterChange();
    }
  }

  /** Enter continues after feedback, even when focus is elsewhere. */
  protected onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.rewardActive()) {
      return;
    }
    if (event.key === 'Enter' && this.view()?.phase === 'feedback' && !target?.closest('button, a, summary, select')) {
      event.preventDefault();
      this.continue();
    }
  }

  private start(cards?: Card[], practising = false): void {
    const quiz = this.quiz();
    const settings = this.settings();
    if (!quiz || !settings) {
      return;
    }
    const scored = settings.testType !== 'presentation';
    this.practising = practising;
    this.session = new TestSession({
      cards: cards ?? prepareCards(quiz.items, settings, Math.random),
      // Practising mistakes keeps going until they are all right.
      repetition: practising && settings.repetition === 'none' ? 'untilAllCorrect' : settings.repetition,
      match: settings.match,
      scored,
      record: (itemId, correct) => this.store.recordAnswer(quiz.id, itemId, correct),
      reorder: (list) => orderCards(list, settings.order, Math.random),
    });
    this.resultSaved = false;
    this.rewardsGiven = 0;
    this.rewardPending = false;
    this.rewardActive.set(false);
    this.restartedNote.set(false);
    this.answer.set('');
    this.askId.update((n) => n + 1);
    this.bump();
  }

  /** After any answer or navigation: a new question gets a fresh input; a finished test is saved. */
  private afterChange(): void {
    const s = this.session;
    if (s?.phase === 'asking') {
      this.answer.set('');
      this.askId.update((n) => n + 1);
    }
    this.restartedNote.set(false);
    if (s?.phase === 'finished') {
      this.saveResult();
    }
    this.checkReward();
    this.bump();
  }

  protected endReward(): void {
    this.rewardActive.set(false);
  }

  /** Every REWARD_EVERY correct answers earns a break; it starts once any feedback has been closed. */
  private checkReward(): void {
    const s = this.session;
    const reward = this.settings()?.reward;
    if (!s || !reward?.enabled || !s.scored) {
      return;
    }
    if (rewardsDue(s.score.correct, this.rewardsGiven) > 0) {
      this.rewardsGiven++;
      this.rewardPending = true;
    }
    if (this.rewardPending && s.phase !== 'feedback') {
      this.rewardPending = false;
      this.rewardActive.set(true);
    }
  }

  /** Stores the score of a scored session once; "actually correct" after the end updates it. */
  private saveResult(): void {
    const s = this.session;
    const quiz = this.quiz();
    if (!s || !quiz || !s.scored || s.score.asked === 0 || this.practising) {
      return;
    }
    const result = {
      date: Date.now(),
      asked: s.score.asked,
      correct: s.score.correct,
      bonus: s.score.bonus,
      percent: scorePercent(s.score),
    };
    if (this.resultSaved) {
      this.store.replaceLastResult(quiz.id, result);
    } else {
      this.store.addResult(quiz.id, result);
      this.resultSaved = true;
    }
  }

  private bump(): void {
    this.version.update((v) => v + 1);
  }

  protected questionLabel(quiz: Quiz, reversed: boolean): string | undefined {
    return reversed ? quiz.answerLanguage : quiz.questionLanguage;
  }
}
