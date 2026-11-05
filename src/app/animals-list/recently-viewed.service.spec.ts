import {
  RECENTLY_VIEWED_LIMIT,
  RECENTLY_VIEWED_STORAGE,
  RecentlyViewedService,
} from './recently-viewed.service';
import { TestBed } from '@angular/core/testing';

describe('RecentlyViewedService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  function service(): RecentlyViewedService {
    return TestBed.inject(RecentlyViewedService);
  }

  it('starts empty when nothing is stored', () => {
    expect(service().recent()).toEqual([]);
  });

  it('records a viewed animal at the front and persists it', () => {
    const viewed = service();
    viewed.record(2, 'Okapi');

    expect(viewed.recent()).toEqual([{ id: 2, commonName: 'Okapi' }]);
    expect(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_STORAGE)!)).toEqual([
      { id: 2, commonName: 'Okapi' },
    ]);
  });

  it('moves a duplicate id to the front and updates the name', () => {
    const viewed = service();
    viewed.record(1, 'Axolotl');
    viewed.record(2, 'Okapi');
    viewed.record(1, 'Axolotl DE');

    expect(viewed.recent()).toEqual([
      { id: 1, commonName: 'Axolotl DE' },
      { id: 2, commonName: 'Okapi' },
    ]);
  });

  it('caps the list at 8 and drops the oldest', () => {
    const viewed = service();
    for (let id = 1; id <= RECENTLY_VIEWED_LIMIT + 2; id++) {
      viewed.record(id, `Animal ${id}`);
    }

    expect(viewed.recent()).toHaveLength(RECENTLY_VIEWED_LIMIT);
    expect(viewed.recent()[0]).toEqual({
      id: RECENTLY_VIEWED_LIMIT + 2,
      commonName: `Animal ${RECENTLY_VIEWED_LIMIT + 2}`,
    });
    expect(viewed.recent().at(-1)).toEqual({ id: 3, commonName: 'Animal 3' });
    expect(viewed.recent().some((item) => item.id === 1 || item.id === 2)).toBe(false);
  });

  it('restores items from localStorage', () => {
    localStorage.setItem(
      RECENTLY_VIEWED_STORAGE,
      JSON.stringify([{ id: 9, commonName: 'Quokka' }]),
    );

    expect(service().recent()).toEqual([{ id: 9, commonName: 'Quokka' }]);
  });

  it('ignores invalid stored JSON', () => {
    localStorage.setItem(RECENTLY_VIEWED_STORAGE, '{not-json');
    expect(service().recent()).toEqual([]);
  });
});
