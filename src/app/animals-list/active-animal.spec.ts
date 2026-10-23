import { indexLabel, pickActive } from './active-animal';

const list = [{ id: 4 }, { id: 7 }, { id: 9 }];

describe('pickActive', () => {
  it('uses the first animal when nothing is hovered or focused', () => {
    expect(pickActive(list, null)).toEqual({ item: list[0], index: 0 });
  });

  it('uses the hovered or focused animal and its position', () => {
    expect(pickActive(list, 9)).toEqual({ item: list[2], index: 2 });
  });

  it('falls back to the first animal when the active one is filtered out', () => {
    expect(pickActive(list, 99)).toEqual({ item: list[0], index: 0 });
  });

  it('returns null for an empty list', () => {
    expect(pickActive([], 4)).toBeNull();
  });
});

describe('indexLabel', () => {
  it('numbers rows from 01 with two digits', () => {
    expect(indexLabel(0)).toBe('01');
    expect(indexLabel(8)).toBe('09');
    expect(indexLabel(11)).toBe('12');
    expect(indexLabel(122)).toBe('123');
  });
});
