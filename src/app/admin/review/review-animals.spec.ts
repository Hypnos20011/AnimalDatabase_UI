import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Animal } from '../../animal-model/animal.model';
import { AnimalService } from '../../shared/animal.service';
import { LanguageService } from '../../shared/i18n/language.service';
import { MissingTranslationCountService } from '../../shared/missing-translation-count.service';
import { ReviewAnimals } from './review-animals';

const animal = {
  id: 1, commonName: 'Okapi', scientificName: 'Okapia johnstoni', family: 'Giraffidae',
  taxonomicClass: 'mammal', habitatType: 'forest', submittedBy: 'tester', status: 'pending',
  thumbnailUrl: 'https://example.org/okapi.jpg', createdAt: '2026-01-01T00:00:00Z',
} as unknown as Animal;

describe('ReviewAnimals', () => {
  function setup(pending: () => Observable<Animal[]> = () => of([animal])) {
    const api = {
      pendingReview: vi.fn(pending),
      approve: vi.fn((_id: number): Observable<void> => of(undefined)),
      reject: vi.fn((_id: number, _note: string): Observable<void> => of(undefined)),
    };
    const refresh = vi.fn();
    TestBed.configureTestingModule({
      imports: [ReviewAnimals],
      providers: [provideRouter([]), { provide: AnimalService, useValue: api },
        { provide: MissingTranslationCountService, useValue: { refresh } }],
    });
    const fixture = TestBed.createComponent(ReviewAnimals);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement, api, refresh };
  }

  it('shows loading, then the list with information and links', () => {
    const result = new Subject<Animal[]>();
    const { fixture, element } = setup(() => result);
    expect(element.textContent).toContain('Loading...');
    result.next([animal]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Okapia johnstoni');
    expect(element.textContent).toContain('Giraffidae');
    expect(element.textContent).toContain('mammal');
    expect(element.textContent).toContain('forest');
    expect(element.textContent).toContain('Submitted by tester');
    expect(element.querySelector('.animal-header p')?.textContent?.trim()).toBe('Okapia johnstoni · Giraffidae · mammal · forest');
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(element.querySelector('a[href="/animals/1"]')).not.toBeNull();
    expect(element.querySelector('a[href="/animals/1/edit"]')).not.toBeNull();
  });

  it('joins only present metadata and shows the submitted role', () => {
    const submittedByAdmin = {
      ...animal,
      scientificName: null,
      family: 'Giraffidae',
      taxonomicClass: null,
      habitatType: 'forest',
      submittedBy: 'admin',
    } as unknown as Animal;
    const { element } = setup(() => of([submittedByAdmin]));

    expect(element.querySelector('.animal-header p')?.textContent?.trim()).toBe('Giraffidae · forest');
    expect(element.textContent).toContain('Submitted by admin');
  });

  it('shows an error with retry and an empty state after retry', () => {
    let attempts = 0;
    const { fixture, element } = setup(() => ++attempts === 1 ? throwError(() => new Error()) : of([]));
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('No new animals are waiting for review.');
  });

  it('approves once, disables other actions, removes the row and refreshes translations', () => {
    const { fixture, component, element, api, refresh } = setup();
    const result = new Subject<void>();
    api.approve.mockReturnValue(result);
    component.approve(1);
    component.approve(1);
    fixture.detectChanges();
    expect(api.approve).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Approving...');
    expect([...element.querySelectorAll<HTMLButtonElement>('.actions button')].every((button) => button.disabled)).toBe(true);
    result.next();
    fixture.detectChanges();
    expect(component.rows()).toEqual([]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each(['A reason', ''])('rejects with a note of %s', (note) => {
    const { fixture, component, element, api } = setup();
    component.rejecting.set(1);
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(textarea.maxLength).toBe(500);
    textarea.value = note;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.textContent).toContain(`${note.length}/500`);
    component.reject(1);
    expect(api.reject).toHaveBeenCalledWith(1, note);
    expect(component.rows()).toEqual([]);
  });

  it.each([[404, 'That animal no longer exists.'], [409, 'That animal was already reviewed.']] as const)(
    'reloads on %s and retains the typed note', (status, message) => {
      const { fixture, component, element, api } = setup();
      component.rejecting.set(1);
      component.setNote(1, 'Keep this');
      api.reject.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      component.reject(1);
      fixture.detectChanges();
      expect(api.pendingReview).toHaveBeenCalledTimes(2);
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(element.querySelector('.reject-panel')).toBeNull();
      expect(component.notes()[1]).toBe('Keep this');
    },
  );

  it('shows access denied and preserves the note on 403', () => {
    const { fixture, component, element, api } = setup();
    component.rejecting.set(1);
    component.setNote(1, 'Keep this');
    api.reject.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.reject(1);
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(TestBed.inject(LanguageService).t('admin.accessDenied'));
    expect(element.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Keep this');
  });

  it('shows the API error for a bad request', () => {
    const { fixture, component, element, api } = setup();
    api.approve.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: 'Bad note' })));
    component.approve(1);
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Bad note');
  });
});