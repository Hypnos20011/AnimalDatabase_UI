import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AdminUnlock } from './admin-unlock';
import { AdminKeyService } from './admin-key.service';
import type { AdminRole } from './admin-key.service';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

describe('AdminUnlock', () => {
  async function setup(verify: (key: string) => Observable<AdminRole | null>, returnUrl?: string) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AdminUnlock],
      providers: [provideRouter([]), provideHttpClient()],
    });
    const admin = TestBed.inject(AdminKeyService);
    const verifySpy = vi.spyOn(admin, 'verify').mockImplementation(verify);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminUnlock);
    if (returnUrl) fixture.componentRef.setInput('returnUrl', returnUrl);
    const element = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await settle();
    const submit = async (key: string) => {
      const input = element.querySelector<HTMLInputElement>('input[type="password"]')!;
      input.value = key;
      input.dispatchEvent(new Event('input'));
      await settle();
      element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await settle();
    };
    return { admin, verifySpy, navigate, element, settle, submit };
  }

  afterEach(() => sessionStorage.clear());

  it('shows one password field and an Unlock button', async () => {
    const { element } = await setup(() => of('admin'));
    expect(element.querySelectorAll('input').length).toBe(1);
    expect(element.querySelector('input')!.type).toBe('password');
    expect(element.querySelector('button[type="submit"]')!.textContent!.trim()).toBe('Unlock');
  });

  it('shows an inline error and stays locked for a wrong key', async () => {
    const { admin, element, navigate, submit } = await setup(() => of(null));
    await submit('wrong');

    expect(element.querySelector('.field-error')!.textContent).toContain("doesn't match");
    expect(admin.unlocked()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stores a valid key and returns to the page the visitor came from', async () => {
    const { admin, verifySpy, navigate, submit } = await setup(() => of('admin'), '/animals/3/edit');
    await submit('  right  ');

    expect(verifySpy).toHaveBeenCalledWith('right');
    expect(admin.key()).toBe('right');
    expect(navigate).toHaveBeenCalledWith('/animals/3/edit');
  });

  it('ignores return addresses outside the app', async () => {
    const { navigate, submit } = await setup(() => of('admin'), '//evil.example');
    await submit('right');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('asks the visitor to wait after too many attempts', async () => {
    const { element, admin, submit } = await setup(() =>
      throwError(() => new HttpErrorResponse({ status: 429, error: 'Too many requests.' })),
    );
    await submit('guess');
    expect(element.querySelector('.field-error')!.textContent!.trim()).toBe(
      'Too many attempts. Try again in a minute.',
    );
    expect(admin.unlocked()).toBe(false);
  });

  it('explains when the server cannot be reached', async () => {
    const { element, admin, submit } = await setup(() => throwError(() => new Error('down')));
    await submit('right');
    expect(element.querySelector('.field-error')!.textContent).toContain("Couldn't reach");
    expect(admin.unlocked()).toBe(false);
  });

  it('offers a quiet Lock link once unlocked', async () => {
    const { admin, element, settle } = await setup(() => of('admin'));
    admin.set('right', 'admin');
    await settle();

    const lock = element.querySelector<HTMLButtonElement>('.lock')!;
    expect(lock.textContent!.trim()).toBe('Lock');
    expect(element.querySelector('input')).toBeNull();
    lock.click();
    await settle();
    expect(admin.unlocked()).toBe(false);
    expect(element.querySelector('input[type="password"]')).not.toBeNull();
  });

  it('only shows the review link to admins', async () => {
    const { admin, element, settle } = await setup(() => of('admin'));
    expect(element.querySelector('a[href="/admin/review"]')).toBeNull();
    admin.set('right', 'tester');
    await settle();
    expect(element.querySelector('a[href="/admin/review"]')).toBeNull();
    admin.set('right', 'admin');
    await settle();
    expect(element.querySelector('a[href="/admin/review"]')?.textContent).toContain('Review');
  });

  it('shows the translation badge only for an admin with a positive count', async () => {
    const { admin, element, settle } = await setup(() => of('admin'));
    const count = TestBed.inject(MissingTranslationCountService).count;
    count.set(2);

    expect(element.querySelector('.missing-count')).toBeNull();

    admin.set('right', 'admin');
    await settle();
    expect(element.querySelector('.missing-count')?.textContent?.trim()).toBe('2');

    count.set(0);
    await settle();
    expect(element.querySelector('.missing-count')).toBeNull();
  });

  it('sends a tester unlocking the admin page to the list without showing a status page', async () => {
    const { admin, element, navigate, submit } = await setup(() => of('tester'));
    const count = TestBed.inject(MissingTranslationCountService).count;
    count.set(2);

    await submit('right');

    expect(admin.role()).toBe('tester');
    expect(navigate).toHaveBeenCalledWith('/');
    expect(element.textContent).not.toContain('Tester access');
    expect(element.querySelector('a[href="/admin/missing"]')).toBeNull();
    expect(element.querySelector('input[type="password"]')).toBeNull();
    expect(element.querySelector('.missing-count')).toBeNull();
  });
});
