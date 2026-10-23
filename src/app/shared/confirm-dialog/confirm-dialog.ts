import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  open = input(false);
  title = input.required<string>();
  message = input.required<string>();
  confirmLabel = input('Delete');
  busyLabel = input('Deleting...');
  busy = input(false);
  error = input('');

  confirmed = output<void>();
  cancelled = output<void>();

  readonly titleId = `confirm-dialog-title-${nextId}`;
  readonly messageId = `confirm-dialog-message-${nextId++}`;

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
        this.cancelButton().nativeElement.focus();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  cancel(): void {
    if (!this.busy()) this.cancelled.emit();
  }

  confirm(): void {
    if (!this.busy()) this.confirmed.emit();
  }

  onNativeCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }
}
