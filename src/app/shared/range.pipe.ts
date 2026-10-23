import { Pipe, PipeTransform } from '@angular/core';
import { formatRange } from './format-range';

@Pipe({ name: 'range' })
export class RangePipe implements PipeTransform {
  transform(
    min: number | null | undefined,
    max: number | null | undefined,
    unit: string,
    decimals = 1,
  ): string {
    return formatRange(min, max, unit, decimals);
  }
}
