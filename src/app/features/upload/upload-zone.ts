import { Component, inject, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Quiz } from '../../core/model/quiz.model';
import { QuizParseError } from '../../core/parsers/parse-error';
import { parseQuizFile } from '../../core/parsers/quiz-file';
import { QuizStore } from '../../core/services/quiz-store.service';
import { BuiltInQuizDialog } from './built-in-quiz-dialog';

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

@Component({
  selector: 'app-upload-zone',
  imports: [TranslatePipe, BuiltInQuizDialog],
  templateUrl: './upload-zone.html',
  styleUrl: './upload-zone.scss',
})
export class UploadZone {
  private readonly store = inject(QuizStore);
  private readonly translate = inject(TranslateService);

  readonly added = output<Quiz>();
  protected readonly dragging = signal(false);
  protected readonly messages = signal<Message[]>([]);

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.readFiles(event.dataTransfer?.files);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onPick(input: HTMLInputElement): void {
    this.readFiles(input.files);
    input.value = '';
  }

  protected addBuiltIn({ fileName, text }: { fileName: string; text: string }): void {
    this.importText(text, fileName);
  }

  private async readFiles(files: FileList | null | undefined): Promise<void> {
    if (!files?.length) {
      return;
    }
    this.messages.set([]);
    for (const file of Array.from(files)) {
      this.importText(await file.text(), file.name);
    }
  }

  private importText(text: string, fileName: string): void {
    let message: Message;
    try {
      const quiz = parseQuizFile(text, fileName);
      this.store.add(quiz);
      this.added.emit(quiz);
      message = {
        kind: 'ok',
        text: this.translate.instant('upload.added', { title: quiz.title, count: quiz.items.length }),
      };
    } catch (e) {
      const reason =
        e instanceof QuizParseError
          ? this.translate.instant(e.messageKey, e.params)
          : this.translate.instant('errors.unexpected');
      message = { kind: 'error', text: this.translate.instant('upload.readError', { file: fileName, message: reason }) };
    }
    this.messages.update((list) => [...list, message]);
  }
}
