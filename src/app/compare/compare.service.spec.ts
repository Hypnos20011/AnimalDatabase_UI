import { TestBed } from '@angular/core/testing';
import { COMPARE_STORAGE, CompareService } from './compare.service';

describe('CompareService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.clear());

  const service = () => TestBed.inject(CompareService);
  const stored = () => JSON.parse(localStorage.getItem(COMPARE_STORAGE) ?? 'null');

  it('starts empty', () => {
    const compare = service();
    expect(compare.selection()).toEqual([]);
    expect(compare.count()).toBe(0);
    expect(compare.ready()).toBe(false);
  });

  it('adds animals in order and persists them', () => {
    const compare = service();
    compare.add(1, 'Okapi');
    compare.add(2, 'Axolotl');

    expect(compare.ids()).toEqual([1, 2]);
    expect(compare.ready()).toBe(true);
    expect(stored()).toEqual([
      { id: 1, commonName: 'Okapi' },
      { id: 2, commonName: 'Axolotl' },
    ]);
  });

  it('keeps at most two animals and drops the oldest', () => {
    const compare = service();
    compare.add(1, 'Okapi');
    compare.add(2, 'Axolotl');
    compare.add(3, 'Tapir');

    expect(compare.ids()).toEqual([2, 3]);
  });

  it('does not add the same animal twice', () => {
    const compare = service();
    compare.add(1, 'Okapi');
    compare.add(1, 'Okapi DE');

    expect(compare.selection()).toEqual([{ id: 1, commonName: 'Okapi DE' }]);
  });

  it('toggles an animal on and off', () => {
    const compare = service();

    expect(compare.toggle(4, 'Tapir')).toBe(true);
    expect(compare.has(4)).toBe(true);
    expect(compare.toggle(4, 'Tapir')).toBe(false);
    expect(compare.has(4)).toBe(false);
    expect(stored()).toEqual([]);
  });

  it('swaps the two sides', () => {
    const compare = service();
    compare.add(1, 'Okapi');
    compare.add(2, 'Axolotl');

    compare.swap();

    expect(compare.ids()).toEqual([2, 1]);
    expect(stored().map((item: { id: number }) => item.id)).toEqual([2, 1]);
  });

  it('does nothing when swapping a single animal', () => {
    const compare = service();
    compare.add(1, 'Okapi');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    compare.swap();

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('removes and clears', () => {
    const compare = service();
    compare.add(1, 'Okapi');
    compare.add(2, 'Axolotl');

    compare.remove(1);
    expect(compare.ids()).toEqual([2]);

    compare.clear();
    expect(compare.selection()).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it('renames a selected animal only when the name changed', () => {
    const compare = service();
    compare.add(1, 'Okapi');

    compare.rename(1, 'Okapi FR');
    compare.rename(9, 'Ghost');

    expect(compare.selection()).toEqual([{ id: 1, commonName: 'Okapi FR' }]);
  });

  it('replaces the selection with set and keeps it valid', () => {
    const compare = service();

    compare.set([
      { id: 5, commonName: 'Shoebill' },
      { id: 5, commonName: 'Shoebill again' },
      { id: 6, commonName: 'Aye-aye' },
    ]);

    expect(compare.ids()).toEqual([5, 6]);
  });

  it('restores a valid stored selection', () => {
    localStorage.setItem(
      COMPARE_STORAGE,
      JSON.stringify([
        { id: 1, commonName: 'Okapi' },
        { id: '2', commonName: 'Axolotl' },
        null,
        { id: 3, commonName: 'Tapir' },
        { id: 4, commonName: 'Quokka' },
      ]),
    );

    expect(service().ids()).toEqual([3, 4]);
  });

  it('ignores invalid stored JSON', () => {
    localStorage.setItem(COMPARE_STORAGE, '{not-json');
    expect(service().selection()).toEqual([]);
  });

  it('keeps the selection separate from favorites', () => {
    service().add(1, 'Okapi');
    expect(localStorage.getItem('animaldb.favorites')).toBeNull();
  });
});
