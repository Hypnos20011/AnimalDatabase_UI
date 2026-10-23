import { WordUnit } from './plural';

export type RangeUnit = string | WordUnit;

export const YEARS: WordUnit = { one: 'year', other: 'years' };

export function formatNumber(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  return String(Math.sign(value) < 0 ? -rounded : rounded);
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
): string {
  const hasMin = min !== null && min !== undefined && !Number.isNaN(Number(min));
  const hasMax = max !== null && max !== undefined && !Number.isNaN(Number(max));
  const low = hasMin ? formatNumber(Number(min), decimals) : '';
  const high = hasMax ? formatNumber(Number(max), decimals) : '';

  if (hasMin && hasMax) {
    return low === high ? `${low} ${unitFor(unit, low)}` : `${low}–${high} ${unitFor(unit, null)}`;
  }
  if (hasMax) {
    return `up to ${high} ${unitFor(unit, high)}`;
  }
  if (hasMin) {
    return `at least ${low} ${unitFor(unit, low)}`;
  }
  return '';
}
