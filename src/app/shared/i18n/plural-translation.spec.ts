import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LanguageService } from './language.service';

describe('LanguageService.tPlural', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('uses the one form for 1 in English', () => {
    expect(TestBed.inject(LanguageService).tPlural('list.count', 1)).toBe('1 animal');
  });

  it('uses the other form for many in English', () => {
    expect(TestBed.inject(LanguageService).tPlural('list.count', 12)).toBe('12 animals');
  });

  it('uses the other form for 0 in English', () => {
    expect(TestBed.inject(LanguageService).tPlural('list.count', 0)).toBe('0 animals');
  });

  it('uses the one form for 1 in German', () => {
    localStorage.setItem('language', 'de');
    expect(TestBed.inject(LanguageService).tPlural('list.count', 1)).toBe('1 Tier');
  });

  it('uses the other form for many in German', () => {
    localStorage.setItem('language', 'de');
    expect(TestBed.inject(LanguageService).tPlural('list.showAnimals', 5)).toBe('5 Tiere anzeigen');
  });

  it('fills the count in the middle of a text', () => {
    expect(TestBed.inject(LanguageService).tPlural('list.top.empty.days', 30)).toBe(
      'No searches in the last 30 days.',
    );
    expect(TestBed.inject(LanguageService).tPlural('list.top.empty.days', 1)).toBe(
      'No searches in the last day.',
    );
  });

  it('falls back to the other form when the category has no key', () => {
    vi.spyOn(Intl.PluralRules.prototype, 'select').mockReturnValue('few');
    expect(TestBed.inject(LanguageService).tPlural('list.count', 3)).toBe('3 animals');
  });

  it('follows a live language switch', () => {
    const i18n = TestBed.inject(LanguageService);
    expect(i18n.tPlural('list.count', 2)).toBe('2 animals');
    i18n.setLanguage('de');
    expect(i18n.tPlural('list.count', 2)).toBe('2 Tiere');
  });
});
