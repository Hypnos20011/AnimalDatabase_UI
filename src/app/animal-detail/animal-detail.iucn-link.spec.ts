import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { AdminKeyService } from '../admin/admin-key.service';
import { Animal } from '../animal-model/animal.model';
import { LanguageService } from '../shared/i18n/language.service';
import { en } from '../shared/i18n/en';
import { de } from '../shared/i18n/de';

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  sizeLengthCmMin: 190,
  sizeLengthCmMax: 200,
  sizeHeightCmMin: 140,
  sizeHeightCmMax: 160,
  weightKgMin: 200,
  weightKgMax: 350,
  lifespanYearsMin: 20,
  lifespanYearsMax: 30,
  iucnStatus: 'endangered',
  habitat: 'Dense tropical rainforest',
  habitatType: 'forest',
  rangeRegion: 'Central Africa',
  profile: null,
  sourceUrl: null,
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} satisfies Animal;

describe('AnimalDetail IUCN Red List link', () => {
  async function render(animal: Animal) {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getById: vi.fn(() => of(animal)), getImages: vi.fn(() => of([])) },
        },
        { provide: AdminKeyService, useValue: { unlocked: signal(false) } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', String(animal.id));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('links the status to the IUCN Red List search for the scientific name', async () => {
    const { element } = await render(okapi);
    const link = element.querySelector('.facts .fact a.status') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent?.trim()).toBe('Endangered');
    expect(link.getAttribute('href')).toBe(
      'https://www.iucnredlist.org/search?query=Okapia%20johnstoni',
    );
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.getAttribute('data-status')).toBe('endangered');
    expect(link.title).toBe('Open IUCN Red List search for this species');
  });

  it('keeps a plain status when there is no scientific name', async () => {
    const { element } = await render({ ...okapi, scientificName: null });
    expect(element.querySelector('.facts .fact a.status')).toBeNull();
    const status = element.querySelector('.facts .fact span.status') as HTMLElement;
    expect(status?.textContent?.trim()).toBe('Endangered');
    expect(status?.getAttribute('data-status')).toBe('endangered');
  });

  it('keeps a plain status when the scientific name is blank', async () => {
    const { element } = await render({ ...okapi, scientificName: '   ' });
    expect(element.querySelector('.facts .fact a.status')).toBeNull();
    expect(element.querySelector('.facts .fact span.status')?.textContent?.trim()).toBe('Endangered');
  });

  it('translates the link title in German', async () => {
    localStorage.setItem('language', 'de');
    const { fixture, element } = await render(okapi);
    const link = element.querySelector('.facts .fact a.status') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Stark gef\u00e4hrdet');
    expect(link.title).toBe(de['detail.iucnRedListLink']);
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    expect(link.title).toBe(en['detail.iucnRedListLink']);
    localStorage.removeItem('language');
  });

  it('has the iucnRedListLink key in both languages', () => {
    expect(en['detail.iucnRedListLink']).toBe('Open IUCN Red List search for this species');
    expect(de['detail.iucnRedListLink']).toContain('IUCN-Rote-Liste');
  });
});