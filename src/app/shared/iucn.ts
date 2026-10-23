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

export const NO_STATUS_CODE = '\u2014';

export function iucnCode(status: string | null | undefined): string {
  const key = status?.trim().toLowerCase() ?? '';
  if (!key) return NO_STATUS_CODE;
  return CODES[key] ?? key.slice(0, 2).toUpperCase();
}

export function iucnLabel(status: string | null | undefined): string {
  return status?.trim() ? status.trim().toLowerCase() : 'status unknown';
}
