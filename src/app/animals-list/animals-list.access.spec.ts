import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AdminKeyService } from '../admin/admin-key.service';
import { Animal } from '../animal-model/animal.model';
import { COMPARE_STORAGE, CompareService } from '../compare/compare.service';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { AnimalListState } from './animal-list-state';
import { AnimalsList } from './animals-list';
import { FAVORITES_STORAGE, FavoritesService } from './favorites.service';
import { RECENTLY_VIEWED_STORAGE } from './recently-viewed.service';
import { SearchService } from './search.service';

function animal(id: number, commonName: string, status: string): Animal {
  return {
    id,
    commonName,
    status,
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
    sourceUrl: null,
    thumbnailUrl: null,
    createdAt: '',
    updatedAt: '',
  } as Animal;
}

const approved = animal(1, 'Okapi', 'approved');
const draft = animal(2, 'Secret draft', 'pending');
const rejected = animal(3, 'Rejected animal', 'rejected');

describe('AnimalsList access changes', () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.scrollTo = originalScrollTo;
  });

  async function setup(
    getAll = vi.fn(() => of([approved, draft])),
    initialKey: string | null = null,
  ) {
    const key = signal<string | null>(initialKey);
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideRouter([]),
        { provide: AdminKeyService, useValue: { key: key.asReadonly(), unlocked: () => !!key() } },
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
    return {
      fixture,
      key,
      getAll,
      list: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  }

  it('immediately hides non-public animals, suggestions, filters, favorites and recents on lock', async () => {
    localStorage.setItem(
      RECENTLY_VIEWED_STORAGE,
      JSON.stringify([
        { id: 2, commonName: 'Secret draft' },
        { id: 1, commonName: 'Old name' },
      ]),
    );
    localStorage.setItem(
      FAVORITES_STORAGE,
      JSON.stringify([{ id: 2, commonName: 'Secret draft', starredAt: '2026-11-01T10:00:00Z' }]),
    );
    localStorage.setItem(
      COMPARE_STORAGE,
      JSON.stringify([
        { id: 1, commonName: 'Okapi' },
        { id: 2, commonName: 'Secret draft' },
      ]),
    );
    const { fixture, key, list } = await setup(undefined, 'admin');
    list.query.set('secret');
    expect(list.suggestions().map((a) => a.id)).toEqual([2]);
    key.set(null);
    expect(list.animals().map((a) => a.id)).toEqual([1]);
    expect(list.suggestions()).toEqual([]);
    expect(list.favoriteItems()).toEqual([]);
    expect(list.compareItems().map((item) => item.id)).toEqual([1]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Secret draft');
    expect((fixture.nativeElement as HTMLElement).querySelector('.compare-now')).toBeNull();
    expect(TestBed.inject(CompareService).ids()).toEqual([1, 2]);
    expect(TestBed.inject(FavoritesService).ids().has(2)).toBe(true);
    expect(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_STORAGE)!).length).toBe(2);
  });

  it('renders English review badges only for pending and rejected animals', async () => {
    const getAll = vi.fn(() => of([approved, draft, rejected]));
    const { fixture, element } = await setup(getAll, 'admin');
    const badges = () =>
      Array.from(element.querySelectorAll('.row')).map((row) => ({
        name: row.querySelector('.name')!.textContent!.trim(),
        status: row.querySelector('.review-status')?.textContent!.trim() ?? null,
      }));
    expect(badges()).toEqual([
      { name: 'Okapi', status: null },
      { name: 'Rejected animal', status: 'Rejected' },
      { name: 'Secret draft', status: 'Pending review' },
    ]);
    expect(element.querySelectorAll('.row')).toHaveLength(3);
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    expect(badges().map((item) => item.status)).toEqual([null, 'Rejected', 'Pending review']);
    TestBed.inject(LanguageService).setLanguage('fr');
    fixture.detectChanges();
    expect(badges().map((item) => item.status)).toEqual([null, 'Rejected', 'Pending review']);
  });

  it('filters non-public entries even when returned by a public request', async () => {
    const { list, element } = await setup(vi.fn(() => of([approved, draft, rejected])));
    expect(list.animals().map((a) => a.id)).toEqual([1]);
    expect(element.querySelectorAll('.review-status')).toHaveLength(0);
  });

  it('hides the previous key’s non-public animals until the new key response arrives', async () => {
    const response = new Subject<Animal[]>();
    const getAll = vi
      .fn()
      .mockReturnValueOnce(of([approved, draft]))
      .mockReturnValueOnce(response);
    const { fixture, key, list } = await setup(getAll, 'first');
    expect(list.animals().map((a) => a.id)).toEqual([1, 2]);
    key.set('second');
    expect(list.animals().map((a) => a.id)).toEqual([1]);
    fixture.detectChanges();
    response.next([approved, rejected]);
    expect(list.animals().map((a) => a.id)).toEqual([1, 3]);
  });

  it('ignores a stale error before the key-change effect runs', async () => {
    const first = new Subject<Animal[]>();
    const second = new Subject<Animal[]>();
    const getAll = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { fixture, key, list } = await setup(getAll, 'admin');
    key.set(null);
    first.error(new Error('old failure'));
    expect(list.error()).toBe(false);
    expect(list.loading()).toBe(true);
    fixture.detectChanges();
    second.next([approved]);
    expect(list.error()).toBe(false);
    expect(list.animals()).toEqual([approved]);
  });

  it('reloads for each key change, clears errors and ignores stale responses before the effect runs', async () => {
    const first = new Subject<Animal[]>();
    const second = new Subject<Animal[]>();
    const third = new Subject<Animal[]>();
    const getAll = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    const { fixture, key, list } = await setup(getAll);
    key.set('admin');
    first.next([draft]);
    expect(list.animals()).toEqual([]);
    fixture.detectChanges();
    expect(getAll).toHaveBeenCalledTimes(2);
    second.error(new Error('offline'));
    expect(list.error()).toBe(true);
    key.set(null);
    fixture.detectChanges();
    expect(getAll).toHaveBeenCalledTimes(3);
    expect(list.error()).toBe(false);
    third.next([approved]);
    expect(list.animals()).toEqual([approved]);
    expect(list.loading()).toBe(false);
  });

  it('uses only approved animals for the random pool, including when no filters match', async () => {
    const { fixture, list } = await setup(undefined, 'admin');
    const state = TestBed.inject(AnimalListState);
    expect(state.randomPool()).toEqual([1]);
    list.query.set('secret');
    fixture.detectChanges();
    expect(state.randomPool()).toEqual([1]);
    list.query.set('no match');
    fixture.detectChanges();
    expect(state.randomPool()).toEqual([1]);
  });

  it('uses matching public animals when possible and an empty pool if there are none', async () => {
    const another = animal(4, 'Axolotl', 'approved');
    const { fixture, list } = await setup(
      vi.fn(() => of([approved, another, draft])),
      'admin',
    );
    const state = TestBed.inject(AnimalListState);
    list.query.set('okapi');
    fixture.detectChanges();
    expect(state.randomPool()).toEqual([1]);
    fixture.destroy();
    TestBed.resetTestingModule();
    const next = await setup(
      vi.fn(() => of([draft, rejected])),
      'admin',
    );
    expect(TestBed.inject(AnimalListState).randomPool()).toEqual([]);
    next.fixture.destroy();
  });

  it('restores scroll only on the first successful current response', async () => {
    const { fixture, key } = await setup();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    key.set('admin');
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(LanguageService).setLanguage('de');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('restores scroll after recovery from the initial failure and cancels requests on destroy', async () => {
    const first = new Subject<Animal[]>();
    const second = new Subject<Animal[]>();
    const getAll = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { fixture, key } = await setup(getAll);
    first.error(new Error('offline'));
    expect(window.scrollTo).not.toHaveBeenCalled();
    TestBed.inject(AnimalListState).scrollY.set(450);
    key.set('admin');
    fixture.detectChanges();
    second.next([approved]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(window.scrollTo).toHaveBeenCalledOnce();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 450);
    expect(second.observed).toBe(true);
    fixture.destroy();
    expect(second.observed).toBe(false);
  });
});
