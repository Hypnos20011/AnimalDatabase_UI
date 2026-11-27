import { RangeWords, formatRange } from './format-range';
import { WordUnit } from './plural';

export type MeasurementKind = 'length' | 'height' | 'weight' | 'lifespan';
export type MeasurementUnit = 'mm' | 'cm' | 'm' | 'g' | 'kg' | 'month' | 'year';

export interface MeasurementUnitWords {
  month: WordUnit;
  year: WordUnit;
}

const FACTORS: Record<MeasurementKind, Partial<Record<MeasurementUnit, number>>> = {
  length: { mm: 1, cm: 10, m: 1000 },
  height: { mm: 1, cm: 10, m: 1000 },
  weight: { g: 1, kg: 1000 },
  lifespan: { month: 1, year: 12 },
};

const PRECISION: Record<MeasurementKind, number> = {
  length: 2,
  height: 2,
  weight: 3,
  lifespan: 1,
};

const MAX_CANONICAL: Record<MeasurementKind, number> = {
  length: 9999999.99,
  height: 9999999.99,
  weight: 9999999999.999,
  lifespan: 99999.9,
};

export function factorFor(kind: MeasurementKind, unit: MeasurementUnit): number {
  const factor = FACTORS[kind][unit];
  if (factor === undefined) throw new RangeError(`Unsupported ${kind} unit: ${unit}`);
  return factor;
}

export function roundCanonical(value: number, kind: MeasurementKind): number {
  const factor = 10 ** PRECISION[kind];
  const scaled = Math.abs(value) * factor;
  const rounded = Math.round(scaled + Number.EPSILON * Math.max(scaled, 1));
  return Math.sign(value) * rounded / factor;
}

export function toCanonical(value: number, kind: MeasurementKind, unit: MeasurementUnit): number {
  return roundCanonical(value * factorFor(kind, unit), kind);
}

export function fromCanonical(
  value: number | null,
  kind: MeasurementKind,
  unit: MeasurementUnit,
): number | null {
  return value === null ? null : value / factorFor(kind, unit);
}

export function convertUnit(
  value: number | null,
  kind: MeasurementKind,
  from: MeasurementUnit,
  to: MeasurementUnit,
): number | null {
  return value === null ? null : Number(((value * factorFor(kind, from)) / factorFor(kind, to)).toPrecision(15));
}

export function maxInUnit(kind: MeasurementKind, unit: MeasurementUnit): number {
  return Number((MAX_CANONICAL[kind] / factorFor(kind, unit)).toFixed(9));
}

export function chooseDisplayUnit(
  kind: MeasurementKind,
  min: number | null,
  max: number | null,
): MeasurementUnit {
  const values = [min, max].filter((value): value is number => value !== null && Number.isFinite(value));
  const largest = values.length ? Math.max(...values) : 0;
  if (kind === 'length' || kind === 'height') {
    return largest < 10 ? 'mm' : largest < 1000 ? 'cm' : 'm';
  }
  if (kind === 'weight') return largest < 1000 ? 'g' : 'kg';
  return largest < 24 ? 'month' : 'year';
}

export function formatMeasurementRange(
  min: number | null,
  max: number | null,
  kind: MeasurementKind,
  language: string,
  units: MeasurementUnitWords,
  words?: RangeWords,
): string {
  const unit = chooseDisplayUnit(kind, min, max);
  const factor = factorFor(kind, unit);
  const displayMin = min === null ? null : min / factor;
  const displayMax = max === null ? null : max / factor;
  const decimals = unit === 'mm' ? 2
    : unit === 'cm' ? 3
      : unit === 'm' ? 5
        : unit === 'g' ? 3
          : unit === 'kg' ? 6
            : unit === 'month' ? 1
              : 6;
  const suffix = unit === 'month' ? units.month : unit === 'year' ? units.year : unit;
  return formatRange(displayMin, displayMax, suffix, decimals, language, words);
}
