import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

type DialogShim = { showModal?: () => void; close?: () => void };

describe('ConfirmDialog', () => {
  beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as DialogShim;
    proto.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  async function setup(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.componentRef.setInput('title', 'Delete Okapi?');
    fixture.componentRef.setInput('message', 'Gone for good.');
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog') as HTMLDialogElement;
    const cancel = element.querySelector('.confirm-cancel') as HTMLButtonElement;
    const confirm = element.querySelector('.confirm-delete') as HTMLButtonElement;
    return { fixture, element, dialog, cancel, confirm };
  }

  it('stays closed until opened', async () => {
    const { dialog } = await setup();
    expect(dialog.open).toBe(false);
  });

  it('opens as a modal with the title and message and focuses Cancel', async () => {
    const { dialog, cancel, element } = await setup({ open: true });
    expect(dialog.open).toBe(true);
    expect(element.querySelector('.confirm-title')?.textContent).toContain('Delete Okapi?');
    expect(element.querySelector('.confirm-message')?.textContent).toContain('Gone for good.');
    expect(dialog.getAttribute('aria-labelledby')).toBe(
      element.querySelector('.confirm-title')?.id,
    );
    expect(document.activeElement).toBe(cancel);
  });

  it('emits cancelled and not confirmed when Cancel is clicked', async () => {
    const { fixture, cancel } = await setup({ open: true });
    const cancelled = vi.fn();
    const confirmed = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentInstance.confirmed.subscribe(confirmed);

    cancel.click();

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('treats Escape as cancel', async () => {
    const { fixture, dialog } = await setup({ open: true });
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    const escape = new Event('cancel', { cancelable: true });

    dialog.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('emits confirmed when Delete is clicked', async () => {
    const { fixture, confirm } = await setup({ open: true });
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);

    confirm.click();

    expect(confirmed).toHaveBeenCalledTimes(1);
  });

  it('shows a busy state and ignores clicks while busy', async () => {
    const { fixture, confirm, cancel, dialog } = await setup({ open: true, busy: true });
    const confirmed = vi.fn();
    const cancelled = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.cancelled.subscribe(cancelled);

    expect(confirm.textContent?.trim()).toBe('Deleting...');
    expect(confirm.disabled).toBe(true);
    expect(confirm.getAttribute('aria-busy')).toBe('true');
    expect(cancel.disabled).toBe(true);
    fixture.componentInstance.confirm();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(confirmed).not.toHaveBeenCalled();
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('shows an error inline', async () => {
    const { element } = await setup({ open: true, error: 'Could not delete this animal.' });
    const error = element.querySelector('.confirm-error');
    expect(error?.textContent).toContain('Could not delete this animal.');
    expect(error?.getAttribute('role')).toBe('alert');
  });

  it('closes again when open becomes false', async () => {
    const { fixture, dialog } = await setup({ open: true });
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
  });
});
