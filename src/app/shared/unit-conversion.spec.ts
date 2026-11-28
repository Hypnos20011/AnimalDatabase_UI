import { describe, expect, it } from 'vitest';
import {
  chooseDisplayUnit,
  convertUnit,
  formatMeasurementRange,
  fromCanonical,
  toCanonical,
} from './unit-conversion';

const units = {
  month: { one: 'month', other: 'months' },
  year: { one: 'year', other: 'years' },
};

describe('unit conversion', () => {
  it('converts and rounds canonical values without losing tiny weights', () => {
    expect(toCanonical(0.002, 'weight', 'kg')).toBe(2);
    expect(toCanonical(2, 'weight', 'g')).toBe(2);
    expect(fromCanonical(2, 'weight', 'kg')).toBe(0.002);
    expect(convertUnit(2, 'weight', 'g', 'kg')).toBe(0.002);
    expect(convertUnit(0.002, 'weight', 'kg', 'g')).toBe(2);
    expect(convertUnit(1.001, 'weight', 'kg', 'g')).toBe(1001);
  });

  it('rounds each canonical measurement away from zero at the required precision', () => {
    expect(toCanonical(1.005, 'length', 'mm')).toBe(1.01);
    expect(toCanonical(0.0005, 'weight', 'g')).toBe(0.001);
    expect(toCanonical(0.05, 'lifespan', 'month')).toBe(0.1);
    expect(toCanonical(-1.005, 'length', 'mm')).toBe(-1.01);
    expect(toCanonical(1.5, 'lifespan', 'year')).toBe(18);
    expect(toCanonical(2.5, 'length', 'm')).toBe(2500);
    expect(toCanonical(2, 'height', 'cm')).toBe(20);
  });

  it('chooses a unit from the largest present canonical value', () => {
    expect(chooseDisplayUnit('length', 4, 2500)).toBe('m');
    expect(chooseDisplayUnit('weight', 2, 1000)).toBe('kg');
    expect(chooseDisplayUnit('lifespan', 18, null)).toBe('month');
    expect(chooseDisplayUnit('lifespan', 24, null)).toBe('year');
    expect(chooseDisplayUnit('lifespan', 25, null)).toBe('month');
    expect(chooseDisplayUnit('lifespan', 24, 25)).toBe('month');
    expect(chooseDisplayUnit('lifespan', 24, 30)).toBe('year');
    expect(chooseDisplayUnit('lifespan', 25, 30)).toBe('month');
  });

  it('formats canonical ranges in readable selected units', () => {
    expect(formatMeasurementRange(2, 2, 'weight', 'en', units)).toBe('2 g');
    expect(formatMeasurementRange(136000000, 136000000, 'weight', 'en', units)).toBe('136,000 kg');
    expect(formatMeasurementRange(4, 4, 'length', 'en', units)).toBe('4 mm');
    expect(formatMeasurementRange(2500, 2500, 'length', 'en', units)).toBe('2.5 m');
    expect(formatMeasurementRange(18, 18, 'lifespan', 'en', units)).toBe('18 months');
    expect(formatMeasurementRange(25, 25, 'lifespan', 'en', units)).toBe('25 months');
    expect(formatMeasurementRange(30, 30, 'lifespan', 'en', units)).toBe('2.5 years');
    expect(formatMeasurementRange(24, 24, 'lifespan', 'en', units)).toBe('2 years');
    expect(formatMeasurementRange(1560, 1560, 'lifespan', 'en', units)).toBe('130 years');
  });

  it('formats localized singular, plural and open ranges without losing canonical precision', () => {
    const de = { month: { one: 'Monat', other: 'Monate' }, year: { one: 'Jahr', other: 'Jahre' } };
    const fr = { month: { one: 'mois', other: 'mois' }, year: { one: 'an', other: 'ans' } };
    expect(formatMeasurementRange(1, 1, 'lifespan', 'de', de)).toBe('1 Monat');
    expect(formatMeasurementRange(18, 18, 'lifespan', 'de', de)).toBe('18 Monate');
    expect(formatMeasurementRange(24, 24, 'lifespan', 'fr', fr)).toBe('2 ans');
    expect(formatMeasurementRange(null, 2500, 'length', 'de', de, { upTo: 'bis zu', atLeast: 'mindestens' }))
      .toBe('bis zu 2,5 m');
    expect(formatMeasurementRange(1000.001, 1000.001, 'weight', 'en', units)).toBe('1.000001 kg');
    expect(formatMeasurementRange(null, null, 'length', 'en', units)).toBe('');
  });
});
