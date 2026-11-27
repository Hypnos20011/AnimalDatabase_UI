import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';
import { AdminKeyService } from './admin-key.service';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  function setup(pendingReview: () => Observable<Animal[]>, initialTranslationCount = 0) {
    const count = signal(initialTranslationCount);
    const state = signal<'locked' | 'loading' | 'ready' | 'error'>('ready');
    const lock = vi.fn();
    TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { pendingReview } },
        { provide: MissingTranslationCountService, useValue: { count, state } },
        { provide: AdminKeyService, useValue: { lock } },
      ],
    });
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, count, state, lock };
  }

  it('loads the review count once and renders all dashboard cards with accessible links', () => {
    const request = new Subject<Animal[]>();
    const pendingReview = vi.fn(() => request);
    const { fixture, element, count, lock } = setup(pendingReview, 3);

    expect(pendingReview).toHaveBeenCalledOnce();
    expect(element.querySelector('.card-review .card-count')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.card-review')?.getAttribute('aria-label')).toBe('Review count is loading');
    expect(element.querySelector('.card-translations .card-count')?.textContent?.trim()).toBe('3');
    expect(element.querySelector('.card-translations')?.getAttribute('aria-label')).toBe(
      '3 animals with missing German or French text',
    );
    expect(element.querySelector('.card-add .card-count')?.textContent?.trim()).toBe('+');
    expect(element.querySelector('.card-review')?.getAttribute('href')).toBe('/admin/review');
    expect(element.querySelector('.card-translations')?.getAttribute('href')).toBe('/admin/missing');
    expect(element.querySelector('.card-add')?.getAttribute('href')).toBe('/animals/new');
    expect(element.querySelector('.status')?.textContent?.trim()).toBe('Admin');

    request.next([{ id: 1 }, { id: 2 }] as Animal[]);
    fixture.detectChanges();
    expect(element.querySelector('.card-review .card-count')?.textContent?.trim()).toBe('2');
    expect(element.querySelector('.card-review')?.getAttribute('aria-label')).toBe('2 animals waiting for review');
    expect(element.querySelector('.card-review .card-count')?.classList.contains('is-positive')).toBe(true);

    count.set(0);
    fixture.detectChanges();
    expect(element.querySelector('.card-translations .card-count')?.textContent?.trim()).toBe('0');
    expect(element.querySelector('.card-translations .card-count')?.classList.contains('is-positive')).toBe(false);

    element.querySelector<HTMLButtonElement>('.lock')!.click();
    expect(lock).toHaveBeenCalledOnce();
  });

  it('shows an em dash without an error banner when the review count fails', () => {
    const { element } = setup(() => throwError(() => new Error('unavailable')));

    expect(element.querySelector('.card-review .card-count')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.card-review')?.getAttribute('aria-label')).toBe('Review count is unavailable');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an em dash while the review count is loading', () => {
    const request = new Subject<Animal[]>();
    const { element } = setup(() => request);

    expect(element.querySelector('.card-review .card-count')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.card-review')?.getAttribute('aria-label')).toBe('Review count is loading');
  });

  it('shows an em dash for translations while the shared count is loading or has failed', () => {
    const { fixture, element, state } = setup(() => of([]), 2);

    state.set('loading');
    fixture.detectChanges();
    expect(element.querySelector('.card-translations .card-count')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.card-translations')?.getAttribute('aria-label')).toBe('Translation count is loading');

    state.set('error');
    fixture.detectChanges();
    expect(element.querySelector('.card-translations .card-count')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.card-translations')?.getAttribute('aria-label')).toBe('Translation count is unavailable');
  });
});
