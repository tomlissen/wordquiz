import { Component, computed, ElementRef, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NewItem } from '../../core/services/quiz-store.service';
import { joinAlternatives } from './alternatives';
import { parseBulkText } from './bulk-parse';

/** Paste many questions at once; shows what will be added before adding it. */
@Component({
  selector: 'app-bulk-add-dialog',
  imports: [TranslatePipe],
  templateUrl: './bulk-add-dialog.html',
  styleUrl: './bulk-add-dialog.scss',
})
export class BulkAddDialog {
  readonly added = output<NewItem[]>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly text = signal('');
  protected readonly parsed = computed(() => parseBulkText(this.text()));
  protected readonly join = joinAlternatives;

  open(): void {
    this.text.set('');
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected add(): void {
    const { items } = this.parsed();
    if (items.length) {
      this.added.emit(items);
      this.close();
    }
  }

  /** Clicks on the backdrop land on the dialog element itself. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
