import { TestBed } from '@angular/core/testing';
import { FAVORITES_STORAGE, FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  function service(): FavoritesService {
    return TestBed.inject(FavoritesService);
  }

  function stored(): unknown {
    return JSON.parse(localStorage.getItem(FAVORITES_STORAGE)!);
  }

  it('starts empty when nothing is stored', () => {
    expect(service().favorites()).toEqual([]);
  });

  it('adds a favorite with a timestamp and persists it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
    const favorites = service();

    favorites.add(2, 'Okapi');

    const expected = [{ id: 2, commonName: 'Okapi', starredAt: '2026-11-05T10:00:00.000Z' }];
    expect(favorites.favorites()).toEqual(expected);
    expect(stored()).toEqual(expected);
    expect(favorites.isFavorite(2)).toBe(true);
    expect(favorites.isFavorite(3)).toBe(false);
  });

  it('puts the most recently starred animal first', () => {
    const favorites = service();
    favorites.add(1, 'Axolotl');
    favorites.add(2, 'Okapi');
    favorites.add(3, 'Quokka');

    expect(favorites.favorites().map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it('has no cap on the number of favorites', () => {
    const favorites = service();
    for (let id = 1; id <= 50; id++) {
      favorites.add(id, `Animal ${id}`);
    }

    expect(favorites.favorites()).toHaveLength(50);
  });

  it('updates the name without moving an existing favorite', () => {
    const favorites = service();
    favorites.add(1, 'Axolotl');
    favorites.add(2, 'Okapi');
    const starredAt = favorites.favorites()[1].starredAt;

    favorites.add(1, 'Axolotl DE');

    expect(favorites.favorites().map((item) => item.id)).toEqual([2, 1]);
    expect(favorites.favorites()[1]).toEqual({ id: 1, commonName: 'Axolotl DE', starredAt });
  });

  it('removes a favorite and persists the change', () => {
    const favorites = service();
    favorites.add(1, 'Axolotl');
    favorites.add(2, 'Okapi');

    favorites.remove(1);

    expect(favorites.favorites().map((item) => item.id)).toEqual([2]);
    expect((stored() as { id: number }[]).map((item) => item.id)).toEqual([2]);
  });

  it('toggles a favorite on and off', () => {
    const favorites = service();

    expect(favorites.toggle(4, 'Tapir')).toBe(true);
    expect(favorites.isFavorite(4)).toBe(true);
    expect(favorites.toggle(4, 'Tapir')).toBe(false);
    expect(favorites.isFavorite(4)).toBe(false);
    expect(stored()).toEqual([]);
  });

  it('prunes favorites whose animal no longer exists', () => {
    const favorites = service();
    favorites.add(1, 'Axolotl');
    favorites.add(2, 'Okapi');
    favorites.add(3, 'Quokka');

    favorites.pruneMissing([1, 3, 9]);

    expect(favorites.favorites().map((item) => item.id)).toEqual([3, 1]);
    expect((stored() as { id: number }[]).map((item) => item.id)).toEqual([3, 1]);
  });

  it('does not rewrite storage when nothing is pruned', () => {
    const favorites = service();
    favorites.add(1, 'Axolotl');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    favorites.pruneMissing([1]);

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('restores favorites sorted by starredAt, newest first', () => {
    localStorage.setItem(
      FAVORITES_STORAGE,
      JSON.stringify([
        { id: 1, commonName: 'Axolotl', starredAt: '2026-11-01T10:00:00.000Z' },
        { id: 2, commonName: 'Okapi', starredAt: '2026-11-03T10:00:00.000Z' },
      ]),
    );

    expect(service().favorites().map((item) => item.id)).toEqual([2, 1]);
  });

  it('drops invalid and duplicate stored entries', () => {
    localStorage.setItem(
      FAVORITES_STORAGE,
      JSON.stringify([
        { id: 1, commonName: 'Axolotl', starredAt: '2026-11-03T10:00:00.000Z' },
        { id: 1, commonName: 'Axolotl old', starredAt: '2026-11-01T10:00:00.000Z' },
        { id: '2', commonName: 'Okapi', starredAt: '2026-11-02T10:00:00.000Z' },
        { id: 3, commonName: 'Quokka' },
        null,
      ]),
    );

    expect(service().favorites()).toEqual([
      { id: 1, commonName: 'Axolotl', starredAt: '2026-11-03T10:00:00.000Z' },
    ]);
  });

  it('ignores invalid stored JSON', () => {
    localStorage.setItem(FAVORITES_STORAGE, '{not-json');
    expect(service().favorites()).toEqual([]);
  });

  it('keeps favorites separate from recently viewed', () => {
    service().add(1, 'Axolotl');
    expect(localStorage.getItem('animaldb.recentlyViewed')).toBeNull();
  });
});
