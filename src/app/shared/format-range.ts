import { WordUnit } from './plural';

export type RangeUnit = string | WordUnit;

export const YEARS: WordUnit = { one: 'year', other: 'years' };
export interface RangeWords {upTo:string, atLeast:string};
export const ENGLISH_RANGE_WORDS: RangeWords = {upTo: 'up to', atLeast: 'at least'};

export function formatNumber(value: number, decimals: number, language: string = 'en'): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: decimals }).format(value);
}

function unitFor(unit: RangeUnit, shown: string | null): string {
  if (typeof unit === 'string') return unit;
  return shown === '1' ? unit.one : unit.other;
}

export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: RangeUnit,
  decimals = 1,
  language = 'en',
  words: RangeWords = ENGLISH_RANGE_WORDS,
): string {
  const hasMin = min !== null && min !== undefined && !Number.isNaN(Number(min));
  const hasMax = max !== null && max !== undefined && !Number.isNaN(Number(max));
  const low = hasMin ? formatNumber(Number(min), decimals, language): '';
  const high = hasMax ? formatNumber(Number(max), decimals, language) : '';

  if (hasMin && hasMax) {
    return low === high ? `${low} ${unitFor(unit, low)}` : `${low}–${high} ${unitFor(unit, null)}`;
  }
  if (hasMax) {
    return `${words.upTo} ${high} ${unitFor(unit, high)}`;
  }
  if (hasMin) {
    return `${words.atLeast} ${low} ${unitFor(unit, low)}`;
  }
  return '';
}
