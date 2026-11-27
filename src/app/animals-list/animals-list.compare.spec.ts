import { TestBed } from '@angular/core/testing';
import { provideLockedAdmin } from './animals-list-test-support';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import { Animal } from '../animal-model/animal.model';
import { COMPARE_STORAGE, CompareService } from '../compare/compare.service';
import { LanguageService } from '../shared/i18n/language.service';

function animal(id: number, commonName: string): Animal {
  return {
    id,
    commonName,
    scientificName: null,
    family: null,
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

describe('AnimalsList compare', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(seed?: { id: number; commonName: string }[]) {
    if (seed) localStorage.setItem(COMPARE_STORAGE, JSON.stringify(seed));
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(animals)) } },
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
    const toggle = (name: string) =>
      Array.from(element.querySelectorAll<HTMLLIElement>('li.row'))
        .find((row) => row.querySelector('.name')!.textContent!.trim() === name)!
        .querySelector<HTMLButtonElement>('button.compare-toggle')!;
    const strip = () => element.querySelector<HTMLElement>('section.compare-strip');
    const links = () =>
      Array.from(element.querySelectorAll<HTMLAnchorElement>('a.compare-link')).map((link) => ({
        text: link.textContent!.trim(),
        href: link.getAttribute('href'),
      }));
    const click = (button: HTMLElement) => {
      button.click();
      fixture.detectChanges();
    };
    return {
      fixture,
      element,
      toggle,
      strip,
      links,
      click,
      compare: TestBed.inject(CompareService),
    };
  }

  it('renders an accessible compare toggle on every row', async () => {
    const { toggle, strip } = await setup();

    expect(toggle('Okapi').getAttribute('type')).toBe('button');
    expect(toggle('Okapi').getAttribute('aria-pressed')).toBe('false');
    expect(toggle('Okapi').getAttribute('aria-label')).toBe('Add Okapi to compare');
    expect(strip()).toBeNull();
  });

  it('adds and removes animals from the comparison', async () => {
    const { toggle, click, compare, links, strip } = await setup();

    click(toggle('Okapi'));

    expect(compare.ids()).toEqual([1]);
    expect(toggle('Okapi').getAttribute('aria-pressed')).toBe('true');
    expect(toggle('Okapi').classList).toContain('is-compared');
    expect(toggle('Okapi').getAttribute('aria-label')).toBe('Remove Okapi from compare');
    expect(links()).toEqual([{ text: 'Okapi', href: '/animals/1' }]);
    expect(strip()!.querySelector('a.compare-now')).toBeNull();

    click(toggle('Okapi'));

    expect(compare.ids()).toEqual([]);
    expect(strip()).toBeNull();
  });

  it('offers Compare now once two are picked and replaces the oldest after that', async () => {
    const { toggle, click, compare, strip } = await setup();

    click(toggle('Okapi'));
    click(toggle('Axolotl'));

    const now = strip()!.querySelector('a.compare-now')!;
    expect(now.textContent!.trim()).toBe('Compare now');
    expect(now.getAttribute('href')).toBe('/compare');

    click(toggle('Tapir'));

    expect(compare.ids()).toEqual([2, 3]);
    expect(toggle('Okapi').getAttribute('aria-pressed')).toBe('false');
  });

  it('clears the selection from the strip', async () => {
    const { strip, click, compare } = await setup([
      { id: 1, commonName: 'Okapi' },
      { id: 2, commonName: 'Axolotl' },
    ]);

    click(strip()!.querySelector<HTMLButtonElement>('button.compare-clear')!);

    expect(compare.selection()).toEqual([]);
    expect(strip()).toBeNull();
  });

  it('translates the toggle and the strip', async () => {
    const { toggle, strip, fixture } = await setup([{ id: 1, commonName: 'Okapi' }]);

    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toggle('Okapi').getAttribute('aria-label')).toBe('Okapi aus dem Vergleich entfernen');
    expect(strip()!.querySelector('h3')!.textContent!.trim()).toBe('Vergleich');
  });
});
