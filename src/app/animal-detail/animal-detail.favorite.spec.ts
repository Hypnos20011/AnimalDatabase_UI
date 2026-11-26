import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AdminKeyService } from '../admin/admin-key.service';
import { FAVORITES_STORAGE, FavoritesService } from '../animals-list/favorites.service';

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  sizeLengthCmMin: null,
  sizeLengthCmMax: null,
  sizeHeightCmMin: null,
  sizeHeightCmMax: null,
  weightKgMin: null,
  weightKgMax: null,
  lifespanYearsMin: null,
  lifespanYearsMax: null,
  iucnStatus: 'endangered',
  habitat: null,
  habitatType: null,
  rangeRegion: null,
  profile: null,
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

describe('AnimalDetail favorite toggle', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup() {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getById: vi.fn(() => of(okapi)), getImages: vi.fn(() => of([])) },
        },
        { provide: AdminKeyService, useValue: { unlocked: signal(false), role: signal('none') } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = () => element.querySelector<HTMLButtonElement>('.detail-header .favorite-toggle')!;
    return { fixture, element, button, favorites: TestBed.inject(FavoritesService) };
  }

  it('shows an unpressed star next to the title', async () => {
    const { element, button } = await setup();

    expect(element.querySelector('.title-row h2')!.textContent).toContain('Okapi');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe('Add Okapi to favorites');
    expect(button().textContent!.trim()).toBe('☆');
  });

  it('adds and removes the animal from favorites', async () => {
    const { fixture, button, favorites } = await setup();

    button().click();
    fixture.detectChanges();

    expect(favorites.favorites()).toEqual([
      { id: 2, commonName: 'Okapi', starredAt: expect.any(String) },
    ]);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE)!)[0].id).toBe(2);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().getAttribute('aria-label')).toBe('Remove Okapi from favorites');
    expect(button().textContent!.trim()).toBe('★');

    button().click();
    fixture.detectChanges();

    expect(favorites.favorites()).toEqual([]);
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });

  it('shows an already favorited animal as pressed', async () => {
    localStorage.setItem(
      FAVORITES_STORAGE,
      JSON.stringify([{ id: 2, commonName: 'Okapi', starredAt: '2026-11-01T10:00:00.000Z' }]),
    );
    const { button } = await setup();

    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('uses German labels', async () => {
    localStorage.setItem('language', 'de');
    const { button } = await setup();

    expect(button().getAttribute('aria-label')).toBe('Okapi zu Favoriten hinzufügen');
  });
});
