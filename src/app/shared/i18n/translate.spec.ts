import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { DICTIONARIES } from './dictionaries';
import { SUPPORTED_LANGUAGES } from './languages';
import { en } from './en';

describe('dictionaries', () => {
  const englishKeys = Object.keys(en).sort();

  for (const lang of SUPPORTED_LANGUAGES) {
    it(`has exactly the English keys for ${lang}`, () => {
      expect(Object.keys(DICTIONARIES[lang]).sort()).toEqual(englishKeys);
    });

    it(`has no empty texts for ${lang}`, () => {
      for (const value of Object.values(DICTIONARIES[lang])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    });
  }
});

describe('LanguageService.t', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns the English text by default', () => {
    expect(TestBed.inject(LanguageService).t('nav.stats')).toBe('Stats');
  });

  it('returns the German text when German is stored', () => {
    localStorage.setItem('language', 'de');
    expect(TestBed.inject(LanguageService).t('nav.stats')).toBe('Statistik');
  });

  it('switches text right after setLanguage', () => {
    const service = TestBed.inject(LanguageService);
    service.setLanguage('de');
    expect(service.t('nav.random')).toBe('Zufälliges Tier');
    service.setLanguage('en');
    expect(service.t('nav.random')).toBe('Random animal');
  });
});