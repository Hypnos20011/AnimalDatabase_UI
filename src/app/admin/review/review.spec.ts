import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalService } from '../../shared/animal.service';
import { MissingTranslationCountService } from '../../shared/missing-translation-count.service';
import { Review } from './review';

describe('Review', () => {
  it('renders the selected New animals tab and its labelled panel', () => {
    TestBed.configureTestingModule({
      imports: [Review],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { pendingReview: () => of([]) } },
        { provide: MissingTranslationCountService, useValue: { refresh: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(Review);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.page-head h2')?.textContent?.trim()).toBe('Review');
    const adminLink = element.querySelector<HTMLAnchorElement>('.page-head a');
    expect(adminLink?.textContent?.trim()).toBe('← Admin');
    expect(adminLink?.getAttribute('href')).toBe('/admin');
    expect(adminLink?.classList.contains('btn-secondary')).toBe(true);
    const tabs = element.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(1);
    expect(tabs[0].textContent).toContain('New animals');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-controls')).toBe('panel-animals');
    expect(element.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe('tab-animals');
  });
});