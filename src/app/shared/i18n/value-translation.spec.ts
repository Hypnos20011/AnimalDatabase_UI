import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService.tValue', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('translates class, habitat and IUCN values in English', () => {
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tValue('class', 'mammal')).toBe('Mammal');
    expect(i18n.tValue('habitat', 'deep sea')).toBe('Deep sea');
    expect(i18n.tValue('iucn', 'critically endangered')).toBe('Critically endangered');
  });

  it('translates class, habitat and IUCN values in German', () => {
    localStorage.setItem('language', 'de');
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tValue('class', 'invertebrate')).toBe('Wirbelloses Tier');
    expect(i18n.tValue('habitat', 'freshwater')).toBe('Süßwasser');
    expect(i18n.tValue('iucn', 'least concern')).toBe('Nicht gefährdet');
  });

  it('returns the raw value when there is no translation', () => {
    localStorage.setItem('language', 'de');
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tValue('habitat', 'tundra')).toBe('tundra');
    expect(i18n.tValue('class', '')).toBe('');
  });

  it('has a German text for every value that has an English text', () => {
    const i18n = TestBed.inject(LanguageService);
    const values: Array<['class' | 'habitat' | 'iucn', string]> = [
      ...['mammal', 'bird', 'reptile', 'amphibian', 'fish', 'invertebrate'].map((v) => ['class', v] as ['class', string]),
      ...['forest', 'grassland', 'desert', 'mountains', 'wetland', 'freshwater', 'ocean', 'deep sea', 'underground'].map(
        (v) => ['habitat', v] as ['habitat', string],
      ),
      ...[
        'least concern',
        'near threatened',
        'vulnerable',
        'endangered',
        'critically endangered',
        'extinct in the wild',
        'extinct',
        'data deficient',
      ].map((v) => ['iucn', v] as ['iucn', string]),
    ];
    i18n.setLanguage('de');
    for (const [group, value] of values) {
      expect(i18n.tValue(group, value)).not.toBe(value);
    }
  });

  it('follows a live language switch', () => {
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tValue('habitat', 'forest')).toBe('Forest');
    i18n.setLanguage('de');
    expect(i18n.tValue('habitat', 'forest')).toBe('Wald');
  });
});
