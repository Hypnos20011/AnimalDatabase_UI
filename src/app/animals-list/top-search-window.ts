import { TranslationKey } from '../shared/i18n/en';

export type TopSearchDays = 7 | 30 | 0;

export interface TopSearchWindow {
  days: TopSearchDays;
  labelKey: TranslationKey;
}

export const DEFAULT_TOP_SEARCH_DAYS: TopSearchDays = 30;

export const TOP_SEARCH_WINDOWS: readonly TopSearchWindow[] = [
  { days: 7, labelKey: 'list.top.window.7' },
  { days: 30, labelKey: 'list.top.window.30' },
  { days: 0, labelKey: 'list.top.window.all' },
];

export function parseTopSearchDays(value: unknown): TopSearchDays {
  if (value === null || value === undefined || value === '') return DEFAULT_TOP_SEARCH_DAYS;
  const days = Number(value);
  return TOP_SEARCH_WINDOWS.find((window) => window.days === days)?.days ?? DEFAULT_TOP_SEARCH_DAYS;
}
