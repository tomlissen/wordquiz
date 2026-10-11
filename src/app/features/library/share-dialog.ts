import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Quiz } from '../../core/model/quiz.model';
import { encodeQuiz, shareUrl } from '../../core/services/share-link';

/** Links longer than this may be cut off by some chat and mail apps. */
export const LONG_LINK = 8000;

/** Shows a link that carries the quiz itself, to open it on another device. */
@Component({
  selector: 'app-share-dialog',
  imports: [TranslatePipe],
  templateUrl: './share-dialog.html',
  styleUrl: './share-dialog.scss',
})
export class ShareDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('link');

  protected readonly title = signal('');
  protected readonly url = signal('');
  protected readonly copied = signal(false);
  protected readonly canShareNatively = typeof navigator.share === 'function';
  protected readonly longLink = LONG_LINK;

  async open(quiz: Quiz): Promise<void> {
    this.title.set(quiz.title);
    this.url.set('');
    this.copied.set(false);
    this.dialog().nativeElement.showModal();
    this.url.set(shareUrl(await encodeQuiz(quiz)));
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // No clipboard access: select the link so Ctrl+C works.
      this.linkInput()?.nativeElement.select();
    }
  }

  protected async shareNatively(): Promise<void> {
    try {
      await navigator.share({ title: this.title(), url: this.url() });
    } catch {
      // Cancelled by the user, or not allowed: nothing to do.
    }
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
