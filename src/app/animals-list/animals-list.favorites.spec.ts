import { TestBed } from '@angular/core/testing';
import { provideLockedAdmin } from './animals-list-test-support';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';
import { FAVORITES_STORAGE, FavoriteItem, FavoritesService } from './favorites.service';

function animal(id: number, commonName: string): Animal {
  return {
    id,
    commonName,
    scientificName: null,
    family: null,
    taxonomicClass: 'mammal',
    isDomesticated: false,
    lengthMmMin: null,
    lengthMmMax: null,
    heightMmMin: null,
    heightMmMax: null,
    weightGramsMin: null,
    weightGramsMax: null,
    lifespanMonthsMin: null,
    lifespanMonthsMax: null,
    iucnStatus: null,
    habitat: null,
    habitatType: null,
    rangeRegion: null,
    profile: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
  } as unknown as Animal;
}

const animals = [animal(1, 'Okapi'), animal(2, 'Axolotl'), animal(3, 'Tapir')];

function favorite(id: number, commonName: string, starredAt: string): FavoriteItem {
  return { id, commonName, starredAt };
}

describe('AnimalsList favorites', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(
    options: { seed?: FavoriteItem[]; data?: Animal[]; fail?: boolean } = {},
  ) {
    if (options.seed) {
      localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(options.seed));
    }
    const getAll = vi.fn(() =>
      options.fail ? throwError(() => new Error('down')) : of(options.data ?? animals),
    );
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll } },
        {
          provide: SearchService,
          useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const section = () => element.querySelector<HTMLElement>('section.favorites');
    const links = () =>
      Array.from(element.querySelectorAll<HTMLAnchorElement>('a.favorite-link')).map((link) => ({
        text: link.textContent!.trim(),
        href: link.getAttribute('href'),
      }));
    const rowNames = () =>
      Array.from(element.querySelectorAll('.row .name')).map((name) => name.textContent!.trim());
    const star = (name: string) =>
      Array.from(element.querySelectorAll<HTMLLIElement>('li.row'))
        .find((row) => row.querySelector('.name')!.textContent!.trim() === name)!
        .querySelector<HTMLButtonElement>('button.favorite-toggle')!;
    const chip = () => element.querySelector<HTMLButtonElement>('button.favorites-chip')!;
    const favorites = TestBed.inject(FavoritesService);
    return { fixture, element, section, links, rowNames, star, chip, favorites };
  }

  it('shows the empty favorites message when nothing is starred', async () => {
    const { section, links } = await setup();

    expect(section()!.querySelector('h3')!.textContent).toContain('Favorites');
    expect(section()!.querySelector('.favorites-empty')!.textContent).toContain(
      'No favorites yet.',
    );
    expect(links()).toEqual([]);
  });

  it('lists favorites most recently starred first with current names', async () => {
    const { links } = await setup({
      seed: [
        favorite(1, 'Old Okapi name', '2026-11-01T10:00:00.000Z'),
        favorite(3, 'Tapir', '2026-11-04T10:00:00.000Z'),
      ],
    });

    expect(links()).toEqual([
      { text: 'Tapir', href: '/animals/3' },
      { text: 'Okapi', href: '/animals/1' },
    ]);
  });

  it('hides missing favorites without deleting stored entries', async () => {
    const { links, favorites } = await setup({
      seed: [
        favorite(1, 'Okapi', '2026-11-01T10:00:00.000Z'),
        favorite(99, 'Ghost', '2026-11-02T10:00:00.000Z'),
      ],
    });

    expect(links()).toEqual([{ text: 'Okapi', href: '/animals/1' }]);
    expect(favorites.favorites().map((item) => item.id)).toEqual([99, 1]);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE)!)).toHaveLength(2);
  });

  it('keeps stored favorites when the animals fail to load', async () => {
    const { section, favorites } = await setup({
      fail: true,
      seed: [favorite(1, 'Okapi', '2026-11-01T10:00:00.000Z')],
    });

    expect(section()).toBeNull();
    expect(favorites.favorites()).toHaveLength(1);
  });

  it('stars and unstars an animal from its row', async () => {
    const { fixture, star, links, favorites } = await setup();
    const button = star('Axolotl');

    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Add Axolotl to favorites');
    expect(button.closest('a')).toBeNull();

    button.click();
    fixture.detectChanges();

    expect(favorites.isFavorite(2)).toBe(true);
    expect(star('Axolotl').getAttribute('aria-pressed')).toBe('true');
    expect(star('Axolotl').getAttribute('aria-label')).toBe('Remove Axolotl from favorites');
    expect(star('Axolotl').textContent!.trim()).toBe('★');
    expect(links()).toEqual([{ text: 'Axolotl', href: '/animals/2' }]);

    star('Axolotl').click();
    fixture.detectChanges();

    expect(favorites.isFavorite(2)).toBe(false);
    expect(star('Axolotl').textContent!.trim()).toBe('☆');
  });

  it('shows only favorites when the favorites chip is on', async () => {
    const { fixture, chip, rowNames } = await setup({
      seed: [favorite(3, 'Tapir', '2026-11-01T10:00:00.000Z')],
    });

    expect(chip().textContent!.trim()).toBe('Favorites only');
    expect(chip().classList.contains('btn')).toBe(true);
    expect(chip().classList.contains('btn-secondary')).toBe(true);
    expect(rowNames()).toHaveLength(3);

    chip().click();
    fixture.detectChanges();

    expect(chip().getAttribute('aria-pressed')).toBe('true');
    expect(chip().classList).toContain('active');
    expect(rowNames()).toEqual(['Tapir']);
    expect(fixture.componentInstance.activeFilterCount()).toBe(1);
  });

  it('clear all also turns off the favorites chip', async () => {
    const { fixture, element, chip, rowNames } = await setup({
      seed: [favorite(3, 'Tapir', '2026-11-01T10:00:00.000Z')],
    });
    chip().click();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.filter-bar .chip.clear')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.favoritesOnly()).toBe(false);
    expect(chip().getAttribute('aria-pressed')).toBe('false');
    expect(rowNames()).toHaveLength(3);
  });

  it('shows German favorites texts', async () => {
    localStorage.setItem('language', 'de');
    const { section, chip, star } = await setup();

    expect(section()!.querySelector('h3')!.textContent).toContain('Favoriten');
    expect(section()!.querySelector('.favorites-empty')!.textContent).toContain(
      'Noch keine Favoriten.',
    );
    expect(chip().textContent!.trim()).toBe('Nur Favoriten');
    expect(star('Okapi').getAttribute('aria-label')).toBe('Okapi zu Favoriten hinzufügen');
  });
});
