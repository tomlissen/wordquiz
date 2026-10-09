import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Card, TestResult } from '../../core/model/quiz.model';
import { Score } from '../../engine/scoring';
import { Autofocus } from '../../shared/autofocus';
import { HistoryChart } from './history-chart';

@Component({
  selector: 'app-results-view',
  imports: [RouterLink, TranslatePipe, Autofocus, HistoryChart],
  templateUrl: './results-view.html',
  styleUrl: './results-view.scss',
})
export class ResultsView {
  readonly score = input.required<Score>();
  readonly percent = input.required<number>();
  readonly scored = input.required<boolean>();
  readonly mistakes = input.required<Card[]>();
  readonly history = input.required<TestResult[]>();
  readonly again = output<void>();
  readonly practise = output<void>();
}
