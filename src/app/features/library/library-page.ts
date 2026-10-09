import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { knownProgress, Quiz } from '../../core/model/quiz.model';
import { downloadJson } from '../../core/services/download';
import { QuizStore } from '../../core/services/quiz-store.service';
import { InfoTip } from '../../shared/info-tip';
import { UploadZone } from '../upload/upload-zone';

@Component({
  selector: 'app-library-page',
  imports: [RouterLink, TranslatePipe, UploadZone, InfoTip],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPage {
  protected readonly store = inject(QuizStore);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  protected newQuiz(): void {
    const quiz = this.store.create(this.translate.instant('editor.newTitle'));
    this.router.navigate(['/quiz', quiz.id]);
  }

  protected readonly progress = knownProgress;

  protected export(quiz: Quiz): void {
    downloadJson(quiz);
  }

  protected remove(quiz: Quiz): void {
    if (confirm(this.translate.instant('library.confirmDelete', { title: quiz.title }))) {
      this.store.remove(quiz.id);
    }
  }
}
