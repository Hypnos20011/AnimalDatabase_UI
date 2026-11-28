import { YEARS, formatRange } from './format-range';

describe('formatRange with word units', () => {
  it('uses the singular for a single value of one', () => {
    expect(formatRange(1, 1, YEARS, 0)).toBe('1 year');
    expect(formatRange(null, 1, YEARS, 0)).toBe('up to 1 year');
    expect(formatRange(1, null, YEARS, 0)).toBe('at least 1 year');
  });

  it('uses the singular when the shown value rounds to one', () => {
    expect(formatRange(0.6, 1.4, YEARS, 0)).toBe('1 year');
    expect(formatRange(null, 0.96, YEARS, 0)).toBe('up to 1 year');
  });

  it('keeps the plural for other values', () => {
    expect(formatRange(2, 2, YEARS, 0)).toBe('2 years');
    expect(formatRange(null, 0, YEARS, 0)).toBe('up to 0 years');
    expect(formatRange(1.5, 1.5, YEARS, 1)).toBe('1.5 years');
    expect(formatRange(null, 15, YEARS, 0)).toBe('up to 15 years');
  });

  it('keeps the plural for ranges, even from one', () => {
    expect(formatRange(1, 2, YEARS, 0)).toBe('1–2 years');
    expect(formatRange(0, 1, YEARS, 0)).toBe('0–1 years');
  });

  it('never changes symbol units', () => {
    expect(formatRange(1, 1, 'cm')).toBe('1 cm');
    expect(formatRange(null, 1, 'kg', 2)).toBe('up to 1 kg');
    expect(formatRange(1, null, 'cm')).toBe('at least 1 cm');
  });
});
