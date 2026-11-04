import {
  SearchableAnimal,
  matchAnimal,
  matchHint,
  matchRank,
  normalizeText,
} from './animal-search';

const okapi: SearchableAnimal = {
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  habitat: 'canopy forest',
  rangeRegion: 'Congo basin, Africa',
  profile: 'A forest giraffe with zebra stripes.',
};

const tiger: SearchableAnimal = {
  commonName: 'Tiger',
  scientificName: 'Panthera tigris',
  habitat: 'rainforests, grasslands, savannas',
  rangeRegion: 'Asia (India, Nepal, Russia / Siberia)',
  profile: null,
};

const pangolin: SearchableAnimal = {
  commonName: 'Indian pangolin',
  scientificName: 'Manis crassicaudata',
  habitat: 'grasslands, secondary forests',
  rangeRegion: 'Sri Lanka, Nilgiri mountains',
  profile: null,
};

describe('normalizeText', () => {
  it('trims, lowercases and collapses whitespace', () => {
    expect(normalizeText('  Congo   Basin\n Africa ')).toBe('congo basin africa');
  });

  it('turns null and undefined into an empty string', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('matchAnimal', () => {
  it('matches the common name', () => {
    expect(matchAnimal(okapi, 'oka')).toEqual({
      name: true,
      habitat: false,
      range: false,
      description: false,
    });
  });

  it('matches the scientific name as a name match', () => {
    expect(matchAnimal(tiger, 'panthera')?.name).toBe(true);
  });

  it('matches the habitat', () => {
    expect(matchAnimal(okapi, 'canopy')).toEqual({
      name: false,
      habitat: true,
      range: false,
      description: false,
    });
  });

  it('matches the range', () => {
    expect(matchAnimal(tiger, 'siberia')).toEqual({
      name: false,
      habitat: false,
      range: true,
      description: false,
    });
  });

  it('still matches the profile text', () => {
    expect(matchAnimal(okapi, 'zebra')?.description).toBe(true);
  });

  it('returns null when nothing matches', () => {
    expect(matchAnimal(okapi, 'desert')).toBeNull();
  });

  it('returns null for an empty or blank query', () => {
    expect(matchAnimal(okapi, '')).toBeNull();
    expect(matchAnimal(okapi, '   ')).toBeNull();
  });

  it('normalizes case and whitespace in query and fields', () => {
    expect(matchAnimal(okapi, '  CONGO   basin ')?.range).toBe(true);
    expect(matchAnimal({ ...okapi, habitat: 'Canopy\n   Forest' }, 'canopy forest')?.habitat).toBe(
      true,
    );
  });

  it('copes with missing fields', () => {
    const bare: SearchableAnimal = {
      commonName: 'Blobfish',
      scientificName: null,
      habitat: null,
      rangeRegion: null,
      profile: null,
    };
    expect(matchAnimal(bare, 'deep')).toBeNull();
    expect(matchAnimal(bare, 'blob')?.name).toBe(true);
  });
});

describe('ranking', () => {
  it('ranks name above habitat above range above description', () => {
    const name = matchRank(matchAnimal(okapi, 'okapi'));
    const habitat = matchRank(matchAnimal(okapi, 'canopy'));
    const range = matchRank(matchAnimal(okapi, 'africa'));
    const description = matchRank(matchAnimal(okapi, 'zebra'));
    expect(name).toBeLessThan(habitat);
    expect(habitat).toBeLessThan(range);
    expect(range).toBeLessThan(description);
  });

  it('sorts a name match before habitat-only matches for the same query', () => {
    const animals = [tiger, pangolin, { ...okapi, commonName: 'Grassland okapi' }];
    const ranked = animals
      .map((animal) => ({ animal, rank: matchRank(matchAnimal(animal, 'grassland')) }))
      .sort((a, b) => a.rank - b.rank || a.animal.commonName.localeCompare(b.animal.commonName))
      .map((entry) => entry.animal.commonName);
    expect(ranked).toEqual(['Grassland okapi', 'Indian pangolin', 'Tiger']);
  });

  it('gives every animal the same rank when there is no query', () => {
    expect(matchRank(null)).toBe(0);
    expect(matchRank(undefined)).toBe(0);
  });
});

describe('matchHint', () => {
  it('shows no hint for name matches', () => {
    expect(matchHint(matchAnimal({ ...okapi, habitat: 'okapi forest' }, 'okapi'))).toBeNull();
  });

  it('names the habitat, the range or both', () => {
    expect(matchHint(matchAnimal(okapi, 'canopy'))).toBe('list.match.habitat');
    expect(matchHint(matchAnimal(okapi, 'congo'))).toBe('list.match.range');
    expect(matchHint(matchAnimal({ ...okapi, rangeRegion: 'canopy of the Congo' }, 'canopy'))).toBe(
      'list.match.habitatRange',
    );
  });

  it('shows no hint for description-only matches or no query', () => {
    expect(matchHint(matchAnimal(okapi, 'zebra'))).toBeNull();
    expect(matchHint(null)).toBeNull();
  });
});
