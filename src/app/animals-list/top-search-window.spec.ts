import {
  DEFAULT_TOP_SEARCH_DAYS,
  TOP_SEARCH_WINDOWS,
  parseTopSearchDays,
  topSearchEmptyText,
} from './top-search-window';

describe('top search window', () => {
  it('offers 7 days, 30 days and all time with 30 days as default', () => {
    expect(TOP_SEARCH_WINDOWS.map((window) => window.days)).toEqual([7, 30, 0]);
    expect(TOP_SEARCH_WINDOWS.map((window) => window.label)).toEqual([
      'Last 7 days',
      'Last 30 days',
      'All time',
    ]);
    expect(DEFAULT_TOP_SEARCH_DAYS).toBe(30);
  });

  it('parses select values', () => {
    expect(parseTopSearchDays('7')).toBe(7);
    expect(parseTopSearchDays('30')).toBe(30);
    expect(parseTopSearchDays('0')).toBe(0);
    expect(parseTopSearchDays(7)).toBe(7);
  });

  it('falls back to 30 days for unknown values', () => {
    expect(parseTopSearchDays('14')).toBe(30);
    expect(parseTopSearchDays('abc')).toBe(30);
    expect(parseTopSearchDays(null)).toBe(30);
    expect(parseTopSearchDays(undefined)).toBe(30);
    expect(parseTopSearchDays('')).toBe(30);
  });

  it('words the empty state for the window', () => {
    expect(topSearchEmptyText(30)).toBe('No searches in the last 30 days.');
    expect(topSearchEmptyText(7)).toBe('No searches in the last 7 days.');
    expect(topSearchEmptyText(1)).toBe('No searches in the last day.');
    expect(topSearchEmptyText(0)).toBe('No searches yet.');
  });
});
