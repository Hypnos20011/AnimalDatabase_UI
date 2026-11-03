import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService.t placeholders', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('fills a number into the placeholder', () => {
    expect(TestBed.inject(LanguageService).t('list.count.other', { count: 12 })).toBe('12 animals');
  });

  it('fills a string into the placeholder', () => {
    expect(TestBed.inject(LanguageService).t('list.count.other', { count: 'many' })).toBe('many animals');
  });

  it('fills the placeholder in the German text', () => {
    localStorage.setItem('language', 'de');
    expect(TestBed.inject(LanguageService).t('list.showAnimals.other', { count: 3 })).toBe(
      '3 Tiere anzeigen',
    );
  });

  it('fills the placeholder in the middle of a text', () => {
    expect(TestBed.inject(LanguageService).t('list.top.empty.days.other', { count: 7 })).toBe(
      'No searches in the last 7 days.',
    );
  });

  it('leaves the placeholder when no params are given', () => {
    expect(TestBed.inject(LanguageService).t('list.count.other')).toBe('{count} animals');
  });

  it('ignores params the text does not use', () => {
    expect(TestBed.inject(LanguageService).t('nav.stats', { count: 5 })).toBe('Stats');
  });
});
