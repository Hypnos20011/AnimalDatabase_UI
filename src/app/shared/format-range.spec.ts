import { TestBed } from '@angular/core/testing';
import { LanguageService } from './i18n/language.service';
import { formatNumber, formatRange, RangeWords } from './format-range';
import { RangePipe } from './range.pipe';

describe('formatRange', () => {
  it('shows a single value when both ends are equal', () => {
    expect(formatRange(5, 5, 'cm')).toBe('5 cm');
  });

  it('treats ends that only differ after rounding as equal', () => {
    expect(formatRange(2.5, 2.5, 'kg', 2)).toBe('2.5 kg');
    expect(formatRange(2.501, 2.499, 'kg', 2)).toBe('2.5 kg');
  });

  it('shows both ends with an en dash when they differ', () => {
    expect(formatRange(140, 280, 'cm')).toBe('140–280 cm');
  });

  it('shows only the maximum as up to', () => {
    expect(formatRange(null, 5, 'cm')).toBe('up to 5 cm');
    expect(formatRange(undefined, 0.17, 'kg', 2)).toBe('up to 0.17 kg');
  });

  it('shows only the minimum as at least', () => {
    expect(formatRange(2, null, 'cm')).toBe('at least 2 cm');
    expect(formatRange(10, undefined, 'years', 0)).toBe('at least 10 years');
  });

  it('returns an empty string when neither end is known', () => {
    expect(formatRange(null, null, 'cm')).toBe('');
    expect(formatRange(undefined, undefined, 'kg', 2)).toBe('');
  });

  it('keeps zero as a known value', () => {
    expect(formatRange(0, 3, 'years', 0)).toBe('0–3 years');
  });

  it('drops trailing zeros and keeps one decimal for lengths', () => {
    expect(formatRange(150.0, 150.0, 'cm')).toBe('150 cm');
    expect(formatRange(0.1, 12.5, 'cm')).toBe('0.1–12.5 cm');
    expect(formatRange(12.34, 12.36, 'cm')).toBe('12.3–12.4 cm');
  });

  it('keeps up to two decimals for weights', () => {
    expect(formatRange(0.06, 0.25, 'kg', 2)).toBe('0.06–0.25 kg');
    expect(formatRange(10.0, 16.0, 'kg', 2)).toBe('10–16 kg');
    expect(formatRange(0.125, 1.5, 'kg', 2)).toBe('0.13–1.5 kg');
  });
});

describe('formatNumber', () => {
  it('rounds to the given decimals without trailing zeros', () => {
    expect(formatNumber(140.0, 1)).toBe('140');
    expect(formatNumber(0.05, 1)).toBe('0.1');
    expect(formatNumber(2.5, 2)).toBe('2.5');
    expect(formatNumber(7.6, 0)).toBe('8');
  });
});

describe('RangePipe', () => {
  it('uses the same wording as formatRange', () => {
    const pipe = TestBed.runInInjectionContext(() => new RangePipe());
    expect(pipe.transform(null, 5, 'cm')).toBe('up to 5 cm');
    expect(pipe.transform(200, 300, 'kg', 2)).toBe('200–300 kg');
    expect(pipe.transform(null, null, 'cm')).toBe('');
  });
});

describe('formatNumber with a language', () => {
  it('uses a decimal comma in German', () => {
    expect(formatNumber(0.5, 2, 'de')).toBe('0,5');
    expect(formatNumber(2.25, 1, 'de')).toBe('2,3');
  });

  it('keeps the decimal point in English and by default', () => {
    expect(formatNumber(0.5, 2, 'en')).toBe('0.5');
    expect(formatNumber(0.5, 2)).toBe('0.5');
  });

  it('drops trailing zeros and rounds whole numbers', () => {
    expect(formatNumber(2.5, 2, 'de')).toBe('2,5');
    expect(formatNumber(20, 0, 'de')).toBe('20');
  });
});

describe('formatRange with a language and words', () => {
  const german: RangeWords = { upTo: 'bis zu', atLeast: 'mindestens' };
  const jahre = { one: 'Jahr', other: 'Jahre' };

  it('uses the given words for up to and at least', () => {
    expect(formatRange(null, 30, jahre, 0, 'de', german)).toBe('bis zu 30 Jahre');
    expect(formatRange(2, null, 'kg', 2, 'de', german)).toBe('mindestens 2 kg');
  });

  it('formats both ends with German decimals', () => {
    expect(formatRange(0.5, 1.25, 'kg', 2, 'de', german)).toBe('0,5\u20131,25 kg');
    expect(formatRange(null, 0.17, 'kg', 2, 'de', german)).toBe('bis zu 0,17 kg');
  });

  it('picks the singular unit for one', () => {
    expect(formatRange(1, 1, jahre, 0, 'de', german)).toBe('1 Jahr');
    expect(formatRange(null, 1, jahre, 0, 'de', german)).toBe('bis zu 1 Jahr');
  });

  it('falls back to English words when none are given', () => {
    expect(formatRange(null, 5, 'cm', 1, 'en')).toBe('up to 5 cm');
    expect(formatRange(2, null, 'cm', 1, 'de')).toBe('at least 2 cm');
  });
});

describe('RangePipe with a language', () => {
  beforeEach(() => {
    localStorage.removeItem('language');
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.removeItem('language'));

  function createPipe(): RangePipe {
    return TestBed.runInInjectionContext(() => new RangePipe());
  }

  it('uses the German words and decimals when the language is German', () => {
    TestBed.inject(LanguageService).setLanguage('de');
    const pipe = createPipe();
    expect(pipe.transform(null, 0.5, 'kg', 2, 'de')).toBe('bis zu 0,5 kg');
    expect(pipe.transform(2, null, 'cm', 1, 'de')).toBe('mindestens 2 cm');
    expect(pipe.transform(null, 30, { one: 'Jahr', other: 'Jahre' }, 0, 'de')).toBe('bis zu 30 Jahre');
  });

  it('keeps English words and decimals in English', () => {
    TestBed.inject(LanguageService).setLanguage('en');
    const pipe = createPipe();
    expect(pipe.transform(null, 0.5, 'kg', 2, 'en')).toBe('up to 0.5 kg');
    expect(pipe.transform(2, null, 'cm', 1, 'en')).toBe('at least 2 cm');
  });

  it('follows a language switch on the next call', () => {
    const i18n = TestBed.inject(LanguageService);
    i18n.setLanguage('en');
    const pipe = createPipe();
    expect(pipe.transform(null, 5, 'cm', 1, 'en')).toBe('up to 5 cm');
    i18n.setLanguage('de');
    expect(pipe.transform(null, 5, 'cm', 1, 'de')).toBe('bis zu 5 cm');
  });
});