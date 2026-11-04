import { inject, Pipe, PipeTransform } from '@angular/core';
import { RangeUnit, formatRange } from './format-range';
import { LanguageService } from './i18n/language.service';

@Pipe({ name: 'range' })
export class RangePipe implements PipeTransform {
  private i18n = inject(LanguageService);

  transform(
    min: number | null | undefined,
    max: number | null | undefined,
    unit: RangeUnit,
    decimals = 1,
    language = 'en',
  ): string {
    return formatRange(min, max, unit, decimals, language, {
      upTo: this.i18n.t('range.upTo'),
      atLeast: this.i18n.t('range.atLeast'),
    });
  }
}
