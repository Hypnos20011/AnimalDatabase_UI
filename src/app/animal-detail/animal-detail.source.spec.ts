import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { AdminKeyService } from '../admin/admin-key.service';
import { Animal } from '../animal-model/animal.model';
import { en } from '../shared/i18n/en';
import { de } from '../shared/i18n/de';

const base = {
  id: 2, commonName: 'Okapi', scientificName: null, family: null, taxonomicClass: null,
  isDomesticated: false, sizeLengthCmMin: null, sizeLengthCmMax: null, sizeHeightCmMin: null,
  sizeHeightCmMax: null, weightKgMin: null, weightKgMax: null, lifespanYearsMin: null,
  lifespanYearsMax: null, iucnStatus: null, habitat: null, habitatType: null, rangeRegion: null,
  profile: null, sourceUrl: null, thumbnailUrl: null,
  status: 'approved', submittedBy: 'admin', reviewedAt: null, reviewNote: null,
  createdAt: '2026-10-08T10:00:00', updatedAt: '2026-10-08T10:00:00',
} satisfies Animal;

describe('AnimalDetail source link', () => {
  async function render(sourceUrl: string | null) {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getById: vi.fn(() => of({ ...base, sourceUrl })), getImages: vi.fn(() => of([])) } },
        { provide: AdminKeyService, useValue: { key: signal(null), unlocked: signal(false), role: signal('none') } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a "Read more" link that opens safely in a new tab', async () => {
    const el = await render('https://en.wikipedia.org/wiki/Okapi');
    const link = el.querySelector('.source a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Okapi');
    expect(link.textContent?.trim()).toBe('Read more');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('hides the link when there is no source', async () => {
    expect((await render(null)).querySelector('.source')).toBeNull();
  });

  it('hides the link when the source is empty', async () => {
    expect((await render('')).querySelector('.source')).toBeNull();
  });

  it('has the readMore key in both languages', () => {
    expect(en['detail.readMore']).toBe('Read more');
    expect(de['detail.readMore']).toBe('Weiterlesen');
  });
});