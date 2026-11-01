import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { DEFAULT_LANGUAGE, isLanguage, SUPPORTED_LANGUAGES } from './languages';

describe('isLanguage', () => {
  it('accepts every supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(isLanguage(lang)).toBe(true);
    }
  });

  it('rejects unknown codes, wrong casing and null', () => {
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage('DE')).toBe(false);
    expect(isLanguage('')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it('defaults to English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });
});

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function create(): LanguageService {
    return TestBed.inject(LanguageService);
  }

  it('starts in English when nothing is stored', () => {
    expect(create().language()).toBe('en');
  });

  it('starts with the stored language', () => {
    localStorage.setItem('language', 'de');
    expect(create().language()).toBe('de');
  });

  it('falls back to English for an unsupported stored value', () => {
    localStorage.setItem('language', 'xyz');
    expect(create().language()).toBe('en');
  });

  it('sets the html lang attribute on start', () => {
    localStorage.setItem('language', 'de');
    create();
    expect(document.documentElement.lang).toBe('de');
  });

  it('updates the signal, storage and html lang on setLanguage', () => {
    const service = create();
    service.setLanguage('de');
    expect(service.language()).toBe('de');
    expect(localStorage.getItem('language')).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('keeps the chosen language for the next visit', () => {
    create().setLanguage('de');
    TestBed.resetTestingModule();
    expect(create().language()).toBe('de');
  });
});