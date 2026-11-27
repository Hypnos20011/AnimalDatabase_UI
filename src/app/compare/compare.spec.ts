import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Compare, parseIds } from './compare';
import { COMPARE_STORAGE, CompareService } from './compare.service';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { Animal } from '../animal-model/animal.model';
import { AdminKeyService } from '../admin/admin-key.service';

function animal(id: number, commonName: string, extra: Partial<Animal> = {}): Animal {
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
    sourceUrl: null,
    thumbnailUrl: null,
    createdAt: '2026-10-08T10:00:00',
    updatedAt: '2026-10-08T10:00:00',
    status: 'approved',
    submittedBy: 'admin',
    reviewedAt: null,
    reviewNote: null,
    ...extra,
  };
}

const okapi = animal(1, 'Okapi', {
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  habitatType: 'forest',
  habitat: 'Rainforest',
  rangeRegion: 'DR Congo',
  sizeLengthCmMin: 190,
  sizeLengthCmMax: 250,
  weightKgMin: 200,
  weightKgMax: 350,
  lifespanYearsMin: 20,
  lifespanYearsMax: 30,
  iucnStatus: 'endangered',
  profile: 'A forest giraffe. Fun fact: It cleans its ears with its tongue.',
});

const axolotl = animal(2, 'Axolotl', {
  scientificName: 'Ambystoma mexicanum',
  taxonomicClass: 'amphibian',
  habitatType: 'freshwater',
  rangeRegion: 'Mexico',
  lifespanYearsMax: 15,
  iucnStatus: 'critically endangered',
  isDomesticated: true,
  profile: 'A salamander that keeps its larval features.',
});

const byId = new Map([okapi, axolotl, animal(3, 'Tapir')].map((a) => [a.id, a]));

describe('Compare', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });
  afterEach(() => localStorage.clear());

  function seed(...items: { id: number; commonName: string }[]) {
    localStorage.setItem(COMPARE_STORAGE, JSON.stringify(items));
  }

  async function setup(url = '/compare', getById = vi.fn((id: number) => of(byId.get(id)!))) {
    const key = signal<string | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'compare', component: Compare }], withComponentInputBinding()),
        { provide: AnimalService, useValue: { getById } },
        { provide: AdminKeyService, useValue: { key } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Compare);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const element = harness.routeNativeElement as HTMLElement;
    const heads = () =>
      Array.from(element.querySelectorAll('.animal-name')).map((el) => el.textContent!.trim());
    const row = (key: string) =>
      Array.from(element.querySelectorAll(`tr[data-row="${key}"] td`)).map((el) =>
        el.textContent!.replace(/\s+/g, ' ').trim(),
      );
    const button = (cls: string) => element.querySelector<HTMLButtonElement>(`button.${cls}`)!;
    const refresh = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    return {
      harness,
      element,
      heads,
      row,
      button,
      refresh,
      getById,
      compare: TestBed.inject(CompareService),
      router: TestBed.inject(Router),
      key,
    };
  }

  it('asks for two animals when nothing is picked', async () => {
    const { element, getById } = await setup();

    expect(element.querySelector('.state-message')!.textContent).toContain('Pick two animals');
    expect(element.querySelector('a.browse')!.getAttribute('href')).toBe('/');
    expect(element.querySelector('table')).toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  it('asks for one more animal when one is picked', async () => {
    seed({ id: 1, commonName: 'Okapi' });
    const { element, button } = await setup();

    expect(element.querySelector('.state-message')!.textContent).toContain(
      'Pick one more animal to compare with Okapi.',
    );
    expect(button('swap')).toBeNull();
    expect(button('clear')).not.toBeNull();
  });

  it('shows both animals side by side', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const { element, heads, row } = await setup();

    expect(heads()).toEqual(['Okapi', 'Axolotl']);
    expect(element.querySelector('a.animal-name')!.getAttribute('href')).toBe('/animals/1');
    expect(row('scientificName')).toEqual(['Okapia johnstoni', 'Ambystoma mexicanum']);
    expect(row('class')).toEqual(['Mammal', 'Amphibian']);
    expect(row('habitatType')).toEqual(['Forest', 'Freshwater']);
    expect(row('habitat')).toEqual(['Rainforest', 'Unknown']);
    expect(row('range')).toEqual(['DR Congo', 'Mexico']);
    expect(row('length')).toEqual(['190–250 cm', 'Unknown']);
    expect(row('weight')).toEqual(['200–350 kg', 'Unknown']);
    expect(row('lifespan')).toEqual(['20–30 years', 'up to 15 years']);
    expect(row('iucn')).toEqual(['Endangered', 'Critically endangered']);
    expect(row('type')).toEqual(['Wild', 'Domesticated']);
    expect(row('highlight')).toEqual([
      'Fun fact It cleans its ears with its tongue.',
      'Profile A salamander that keeps its larval features.',
    ]);
  });

  it('reloads on key changes and removes an animal that becomes unavailable', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    let restricted = false;
    const getById = vi.fn((id: number) =>
      restricted && id === 1
        ? throwError(() => new HttpErrorResponse({ status: 404 }))
        : of(byId.get(id)!),
    );
    const { key, refresh, compare } = await setup('/compare', getById);
    expect(getById).toHaveBeenCalledTimes(2);

    restricted = true;
    key.set('test-key');
    await refresh();

    expect(getById).toHaveBeenCalledTimes(4);
    expect(compare.ids()).toEqual([2]);
  });

  it('marks rows where both animals match', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 3, commonName: 'Tapir' });
    const { element } = await setup();

    expect(element.querySelector('tr[data-row="class"]')!.classList).toContain('is-same');
    expect(element.querySelector('tr[data-row="habitat"]')!.classList).not.toContain('is-same');
  });

  it('swaps the sides without loading again', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const { heads, button, refresh, getById, compare } = await setup();
    getById.mockClear();

    button('swap').click();
    await refresh();

    expect(heads()).toEqual(['Axolotl', 'Okapi']);
    expect(compare.ids()).toEqual([2, 1]);
    expect(getById).not.toHaveBeenCalled();
  });

  it('removes one animal and clears all', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const { element, button, refresh, compare } = await setup();

    const remove = element.querySelector<HTMLButtonElement>('th.animal-head button.remove')!;
    expect(remove.getAttribute('aria-label')).toBe('Remove Okapi from compare');
    remove.click();
    await refresh();

    expect(compare.ids()).toEqual([2]);
    expect(element.querySelector('.state-message')!.textContent).toContain('Axolotl');

    button('clear').click();
    await refresh();

    expect(compare.selection()).toEqual([]);
    expect(element.querySelector('.compare-controls')).toBeNull();
  });

  it('keeps the URL in sync with the selection', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const { button, refresh, router } = await setup();

    expect(router.url).toBe('/compare?ids=1,2');

    button('swap').click();
    await refresh();
    expect(router.url).toBe('/compare?ids=2,1');

    button('clear').click();
    await refresh();
    expect(router.url).toBe('/compare');
  });

  it('opens a shared link with two ids', async () => {
    seed({ id: 3, commonName: 'Tapir' });
    const { heads, compare } = await setup('/compare?ids=2,1');

    expect(heads()).toEqual(['Axolotl', 'Okapi']);
    expect(compare.selection()).toEqual([
      { id: 2, commonName: 'Axolotl' },
      { id: 1, commonName: 'Okapi' },
    ]);
  });

  it('drops an animal that no longer exists', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 9, commonName: 'Ghost' });
    const getById = vi.fn((id: number) =>
      id === 9 ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(byId.get(id)!),
    );
    const { element, compare } = await setup('/compare', getById);

    expect(compare.ids()).toEqual([1]);
    expect(element.querySelector('.state-message')!.textContent).toContain('Okapi');
  });

  it('shows an error when the API is down', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const getById = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500 })));
    const { element, compare } = await setup('/compare', getById);

    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Could not load');
    expect(compare.ids()).toEqual([1, 2]);
  });

  it('reloads in the chosen language and shows German labels', async () => {
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const { element, getById, refresh, row } = await setup();
    getById.mockClear();

    TestBed.inject(LanguageService).setLanguage('de');
    await refresh();

    expect(getById).toHaveBeenCalledWith(1, 'de');
    expect(getById).toHaveBeenCalledWith(2, 'de');
    expect(element.querySelector('h2')!.textContent).toBe('Tiere vergleichen');
    expect(row('type')).toEqual(['Wildtier', 'Haustier']);
  });

  it('uses French labels', async () => {
    localStorage.setItem('language', 'fr');
    seed({ id: 1, commonName: 'Okapi' }, { id: 2, commonName: 'Axolotl' });
    const { element, button } = await setup();

    expect(element.querySelector('h2')!.textContent).toBe('Comparer des animaux');
    expect(button('swap').textContent!.trim()).toBe('Inverser');
  });
});

describe('parseIds', () => {
  it('reads up to two unique positive ids', () => {
    expect(parseIds('3,7')).toEqual([3, 7]);
    expect(parseIds('3, 3, 7, 9')).toEqual([3, 7]);
    expect(parseIds('x,-1,2')).toEqual([2]);
    expect(parseIds(undefined)).toEqual([]);
  });
});
