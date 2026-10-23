import { Pipe, PipeTransform } from '@angular/core';
import { RangeUnit, formatRange } from './format-range';

@Pipe({ name: 'range' })
export class RangePipe implements PipeTransform {
  transform(
    min: number | null | undefined,
    max: number | null | undefined,
    unit: RangeUnit,
    decimals = 1,
  ): string {
    return formatRange(min, max, unit, decimals);
  }
}
