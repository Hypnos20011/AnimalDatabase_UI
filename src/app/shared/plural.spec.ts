import { formatCount, pluralWord } from './plural';

const animals = { one: 'animal', other: 'animals' };

describe('pluralWord', () => {
  it('uses the singular only for exactly one', () => {
    expect(pluralWord(1, animals)).toBe('animal');
    expect(pluralWord(0, animals)).toBe('animals');
    expect(pluralWord(2, animals)).toBe('animals');
    expect(pluralWord(1.5, animals)).toBe('animals');
  });
});

describe('formatCount', () => {
  it('puts the count before the right word', () => {
    expect(formatCount(1, { one: 'field', other: 'fields' })).toBe('1 field');
    expect(formatCount(12, { one: 'field', other: 'fields' })).toBe('12 fields');
    expect(formatCount(0, animals)).toBe('0 animals');
  });
});
