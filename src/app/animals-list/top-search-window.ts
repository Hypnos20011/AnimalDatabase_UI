export type TopSearchDays = 7 | 30 | 0;

export interface TopSearchWindow {
  days: TopSearchDays;
  label: string;
}

export const DEFAULT_TOP_SEARCH_DAYS: TopSearchDays = 30;

export const TOP_SEARCH_WINDOWS: readonly TopSearchWindow[] = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 0, label: 'All time' },
];

export function parseTopSearchDays(value: unknown): TopSearchDays {
  if (value === null || value === undefined || value === '') return DEFAULT_TOP_SEARCH_DAYS;
  const days = Number(value);
  return TOP_SEARCH_WINDOWS.find((window) => window.days === days)?.days ?? DEFAULT_TOP_SEARCH_DAYS;
}

export function topSearchEmptyText(days: number): string {
  if (days <= 0) return 'No searches yet.';
  return days === 1 ? 'No searches in the last day.' : `No searches in the last ${days} days.`;
}
