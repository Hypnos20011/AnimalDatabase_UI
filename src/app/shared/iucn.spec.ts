import { NO_STATUS_CODE, iucnCode, iucnLabel, iucnRedListSearchUrl } from './iucn';

describe('iucnCode', () => {
  it('maps every IUCN status to its two-letter code', () => {
    expect(iucnCode('least concern')).toBe('LC');
    expect(iucnCode('near threatened')).toBe('NT');
    expect(iucnCode('vulnerable')).toBe('VU');
    expect(iucnCode('endangered')).toBe('EN');
    expect(iucnCode('critically endangered')).toBe('CR');
    expect(iucnCode('extinct in the wild')).toBe('EW');
    expect(iucnCode('extinct')).toBe('EX');
    expect(iucnCode('data deficient')).toBe('DD');
  });

  it('ignores case and surrounding spaces', () => {
    expect(iucnCode('  Critically Endangered ')).toBe('CR');
  });

  it('shows a dash when there is no status', () => {
    expect(iucnCode(null)).toBe(NO_STATUS_CODE);
    expect(iucnCode(undefined)).toBe(NO_STATUS_CODE);
    expect(iucnCode('   ')).toBe(NO_STATUS_CODE);
  });

  it('falls back to the first two letters of an unknown status', () => {
    expect(iucnCode('rare')).toBe('RA');
  });
});

describe('iucnLabel', () => {
  it('spells the status out for screen readers', () => {
    expect(iucnLabel('Endangered')).toBe('endangered');
    expect(iucnLabel(null)).toBe('unknown');
  });
});

describe('iucnRedListSearchUrl', () => {
  it('builds the official search URL from a scientific name', () => {
    expect(iucnRedListSearchUrl('Okapia johnstoni')).toBe(
      'https://www.iucnredlist.org/search?query=Okapia%20johnstoni',
    );
  });

  it('encodes special characters in the query', () => {
    expect(iucnRedListSearchUrl('Panthera leo & friends')).toBe(
      'https://www.iucnredlist.org/search?query=Panthera%20leo%20%26%20friends',
    );
  });

  it('trims surrounding spaces', () => {
    expect(iucnRedListSearchUrl('  Ambystoma mexicanum  ')).toBe(
      'https://www.iucnredlist.org/search?query=Ambystoma%20mexicanum',
    );
  });

  it('returns null when there is no usable scientific name', () => {
    expect(iucnRedListSearchUrl(null)).toBeNull();
    expect(iucnRedListSearchUrl(undefined)).toBeNull();
    expect(iucnRedListSearchUrl('')).toBeNull();
    expect(iucnRedListSearchUrl('   ')).toBeNull();
  });
});