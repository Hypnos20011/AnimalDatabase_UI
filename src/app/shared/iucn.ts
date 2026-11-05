const CODES: Record<string, string> = {
  'least concern': 'LC',
  'near threatened': 'NT',
  vulnerable: 'VU',
  endangered: 'EN',
  'critically endangered': 'CR',
  'extinct in the wild': 'EW',
  extinct: 'EX',
  'data deficient': 'DD',
};

export const IUCN_STATUSES_ORDER = ['least concern', 'near threatened', 'vulnerable', 'endangered', 'critically endangered', 'extinct in the wild', 'extinct', 'data deficient'];

export function iucnRank(status: string): number {
  const index = IUCN_STATUSES_ORDER.indexOf(status);
  if (index === -1) {
    return IUCN_STATUSES_ORDER.length;
  }
  return index;
}

export const NO_STATUS_CODE = '\u2014';

export function iucnCode(status: string | null | undefined): string {
  const key = status?.trim().toLowerCase() ?? '';
  if (!key) return NO_STATUS_CODE;
  return CODES[key] ?? key.slice(0, 2).toUpperCase();
}

export function iucnLabel(status: string | null | undefined): string {
  return status?.trim() ? status.trim().toLowerCase() : 'unknown';
}

const IUCN_SEARCH_BASE = 'https://www.iucnredlist.org/search';

/** Official IUCN Red List search URL for a scientific name, or null when none. */
export function iucnRedListSearchUrl(scientificName: string | null | undefined): string | null {
  const query = scientificName?.trim();
  if (!query) return null;
  return `${IUCN_SEARCH_BASE}?query=${encodeURIComponent(query)}`;
}