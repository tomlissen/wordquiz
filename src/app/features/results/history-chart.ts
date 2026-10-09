import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TestResult } from '../../core/model/quiz.model';
import { LanguageService } from '../../core/services/language.service';

const WIDTH = 560;
const HEIGHT = 180;
const PAD = { top: 24, right: 8, bottom: 8, left: 48 };
const MAX_BARS = 30;

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  result: TestResult;
  latest: boolean;
}

/** Score per test as thin columns, newest on the right. */
@Component({
  selector: 'app-history-chart',
  imports: [TranslatePipe, DatePipe],
  template: `
    @if (results().length === 0) {
      <p class="muted">{{ 'results.historyEmpty' | translate }}</p>
    } @else {
      <figure>
        <div class="plot">
          <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="'results.chartLabel' | translate">
            @for (tick of ticks; track tick) {
              <line class="grid" [attr.x1]="pad.left" [attr.x2]="width - pad.right" [attr.y1]="yFor(tick)" [attr.y2]="yFor(tick)" />
              <text class="axis" [attr.x]="pad.left - 6" [attr.y]="yFor(tick)" dy="0.32em" text-anchor="end">{{ tick }}%</text>
            }
            @for (bar of bars(); track bar.result.date) {
              <g
                class="bar"
                tabindex="0"
                [attr.aria-label]="(bar.result.date | date: 'short' : undefined : lang()) + ': ' + bar.result.percent + '%'"
                (mouseenter)="active.set(bar)"
                (mouseleave)="active.set(null)"
                (focus)="active.set(bar)"
                (blur)="active.set(null)"
              >
                <rect class="hit" [attr.x]="bar.x - 2" [attr.y]="pad.top" [attr.width]="bar.w + 4" [attr.height]="plotHeight" />
                <path class="mark" [class.dim]="active() && active() !== bar" [attr.d]="barPath(bar)" />
                @if (bar.latest) {
                  <text class="label" [attr.x]="bar.x + bar.w / 2" [attr.y]="bar.y - 6" text-anchor="middle">
                    {{ bar.result.percent }}%
                  </text>
                }
              </g>
            }
          </svg>
          @if (active(); as bar) {
            <div class="tooltip" [style.left.%]="((bar.x + bar.w / 2) / width) * 100" [style.top.%]="(bar.y / height) * 100">
              <strong>{{ bar.result.percent }}%</strong>
              <span>{{ bar.result.date | date: 'short' : undefined : lang() }}</span>
              <span>{{ 'test.scoreLine' | translate: { correct: bar.result.correct, asked: bar.result.asked } }}</span>
            </div>
          }
        </div>
        <figcaption class="muted">{{ 'results.chartLabel' | translate }}</figcaption>
      </figure>
      <details>
        <summary>{{ 'results.tableView' | translate }}</summary>
        <table>
          <tbody>
            @for (r of results(); track r.date) {
              <tr>
                <td>{{ r.date | date: 'short' : undefined : lang() }}</td>
                <td>{{ 'test.scoreLine' | translate: { correct: r.correct, asked: r.asked } }}</td>
                <td class="num">{{ r.percent }}%</td>
              </tr>
            }
          </tbody>
        </table>
      </details>
    }
  `,
  styleUrl: './history-chart.scss',
})
export class HistoryChart {
  readonly results = input.required<TestResult[]>();
  protected readonly lang = inject(LanguageService).current;
  protected readonly active = signal<Bar | null>(null);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly pad = PAD;
  protected readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;
  protected readonly ticks = [0, 50, 100];

  protected readonly bars = computed<Bar[]>(() => {
    const shown = this.results().slice(-MAX_BARS);
    const plotWidth = WIDTH - PAD.left - PAD.right;
    const slot = plotWidth / MAX_BARS;
    const w = Math.max(4, slot - 2); // 2px surface gap between columns
    return shown.map((result, i) => {
      const h = Math.max(1, (result.percent / 100) * this.plotHeight);
      return { x: PAD.left + i * slot + 1, y: this.yFor(result.percent), w, h, result, latest: i === shown.length - 1 };
    });
  });

  protected yFor(percent: number): number {
    return PAD.top + this.plotHeight * (1 - percent / 100);
  }

  /** Column with 4px rounded data end, square on the baseline. */
  protected barPath(bar: Bar): string {
    const r = Math.min(4, bar.w / 2, bar.h);
    const { x, y, w, h } = bar;
    const base = y + h;
    return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
  }
}
