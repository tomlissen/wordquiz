import { Component, inject, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Quiz } from '../../core/model/quiz.model';
import { QuizParseError } from '../../core/parsers/parse-error';
import { parseQuizFile } from '../../core/parsers/quiz-file';
import { QuizStore } from '../../core/services/quiz-store.service';

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

const SAMPLES = [
  { file: 'animals-en-nl.json', label: 'animals-en-nl.json' },
  { file: 'capitals.json', label: 'capitals.json' },
];

@Component({
  selector: 'app-upload-zone',
  imports: [TranslatePipe],
  templateUrl: './upload-zone.html',
  styleUrl: './upload-zone.scss',
})
export class UploadZone {
  private readonly store = inject(QuizStore);
  private readonly translate = inject(TranslateService);

  readonly added = output<Quiz>();
  protected readonly dragging = signal(false);
  protected readonly messages = signal<Message[]>([]);
  protected readonly samples = SAMPLES;

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

  protected async loadSample(file: string): Promise<void> {
    const response = await fetch(`./samples/${file}`);
    this.importText(await response.text(), file);
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
