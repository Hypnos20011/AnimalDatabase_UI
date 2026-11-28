import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { Language } from '../shared/i18n/languages';
import { TranslationKey } from '../shared/i18n/en';
import { formatMeasurementRange, MeasurementKind } from '../shared/unit-conversion';
import { profileSnippet, splitProfile } from '../shared/profile';
import { wikimediaSrcset } from '../shared/wikimedia-image';
import { AdminKeyService } from '../admin/admin-key.service';
import { COMPARE_MAX, CompareService } from './compare.service';

export interface CompareRow {
  key: string;
  label: string;
  values: string[];
  same: boolean;
}

type LoadResult = { id: number; animal: Animal | null; missing: boolean };

@Component({
  selector: 'app-compare',
  imports: [RouterLink],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export class Compare implements OnInit {
  ids = input<string>();

  private animalService = inject(AnimalService);
  private router = inject(Router);
  private admin = inject(AdminKeyService);
  protected compare = inject(CompareService);
  protected i18n = inject(LanguageService);
  private request?: Subscription;
  private loadedLanguage?: Language;
  private loadedKey: string | null | undefined;
  readonly srcset = wikimediaSrcset;

  animals = signal<Animal[]>([]);
  loading = signal(false);
  error = signal(false);
  selection = this.compare.selection;
  ready = this.compare.ready;

  pending = computed(() => {
    const first = this.selection()[0];
    return first && !this.ready() ? first : null;
  });

  rows = computed<CompareRow[]>(() => {
    const animals = this.animals();
    if (animals.length !== COMPARE_MAX) return [];
    const language = this.i18n.language();
    const units = {
      month: { one: this.i18n.t('unit.month'), other: this.i18n.t('unit.months') },
      year: { one: this.i18n.t('unit.year'), other: this.i18n.t('unit.years') },
    };
    const unknown = this.i18n.t('detail.unknown');
    const range = (min: number | null, max: number | null, kind: MeasurementKind) =>
      formatMeasurementRange(min, max, kind, language, units, {
        upTo: this.i18n.t('range.upTo'),
        atLeast: this.i18n.t('range.atLeast'),
      }) || unknown;
    const text = (value: string | null | undefined) => value?.trim() || unknown;
    const spec: { key: string; label: TranslationKey; value: (a: Animal) => string }[] = [
      {
        key: 'scientificName',
        label: 'compare.scientificName',
        value: (a) => text(a.scientificName),
      },
      {
        key: 'class',
        label: 'detail.class',
        value: (a) => (a.taxonomicClass ? this.i18n.tValue('class', a.taxonomicClass) : unknown),
      },
      { key: 'family', label: 'detail.family', value: (a) => text(a.family) },
      {
        key: 'habitatType',
        label: 'detail.habitatType',
        value: (a) => (a.habitatType ? this.i18n.tValue('habitat', a.habitatType) : unknown),
      },
      { key: 'habitat', label: 'detail.habitat', value: (a) => text(a.habitat) },
      { key: 'range', label: 'detail.range', value: (a) => text(a.rangeRegion) },
      {
        key: 'length',
        label: 'detail.bodyLength',
        value: (a) => range(a.lengthMmMin, a.lengthMmMax, 'length'),
      },
      {
        key: 'height',
        label: 'detail.shoulderHeight',
        value: (a) => range(a.heightMmMin, a.heightMmMax, 'height'),
      },
      {
        key: 'weight',
        label: 'detail.weight',
        value: (a) => range(a.weightGramsMin, a.weightGramsMax, 'weight'),
      },
      {
        key: 'lifespan',
        label: 'detail.lifespan',
        value: (a) => range(a.lifespanMonthsMin, a.lifespanMonthsMax, 'lifespan'),
      },
      {
        key: 'iucn',
        label: 'detail.iucnStatus',
        value: (a) => (a.iucnStatus ? this.i18n.tValue('iucn', a.iucnStatus) : unknown),
      },
      {
        key: 'type',
        label: 'detail.type',
        value: (a) => this.i18n.t(a.isDomesticated ? 'detail.domesticated' : 'detail.wild'),
      },
    ];
    return spec.map((row) => {
      const values = animals.map(row.value);
      return {
        key: row.key,
        label: this.i18n.t(row.label),
        values,
        same: values[0] === values[1] && values[0] !== unknown,
      };
    });
  });

  highlights = computed(() =>
    this.animals().map((animal) => {
      const parts = splitProfile(animal.profile);
      if (parts.funFact) return { kind: 'funFact' as const, text: profileSnippet(parts.funFact) };
      if (parts.text) return { kind: 'profile' as const, text: profileSnippet(parts.text) };
      return null;
    }),
  );

  private initialized = signal(false);

  constructor() {
    effect(() => {
      if (!this.initialized()) return;
      const ids = this.compare.ids();
      const language = this.i18n.language();
      const key = this.admin.key();
      untracked(() => {
        if (this.loadedKey !== undefined && this.loadedKey !== key) {
          this.animals.set([]);
          this.loadedLanguage = undefined;
        }
        this.loadedKey = key;
        this.syncUrl(ids);
        this.load(ids, language);
      });
    });
  }

  ngOnInit(): void {
    const fromUrl = parseIds(this.ids());
    if (fromUrl.length === COMPARE_MAX && fromUrl.join(',') !== this.compare.ids().join(',')) {
      const names = new Map(this.compare.selection().map((item) => [item.id, item.commonName]));
      this.compare.set(fromUrl.map((id) => ({ id, commonName: names.get(id) ?? '' })));
    }
    this.initialized.set(true);
  }

  private load(ids: number[], language: Language): void {
    this.request?.unsubscribe();
    this.error.set(false);
    if (ids.length !== COMPARE_MAX) {
      this.animals.set([]);
      this.loading.set(false);
      return;
    }
    const current = this.animals();
    const sameSet =
      current.length === COMPARE_MAX && ids.every((id) => current.some((a) => a.id === id));
    if (sameSet && language === this.loadedLanguage) {
      this.animals.set(ids.map((id) => current.find((animal) => animal.id === id)!));
      this.loading.set(false);
      return;
    }
    if (!sameSet) {
      this.animals.set([]);
    }
    this.loading.set(true);
    this.request = forkJoin(
      ids.map((id) =>
        this.animalService.getById(id, language).pipe(
          map((animal): LoadResult => ({ id, animal, missing: false })),
          catchError((error: unknown) =>
            of<LoadResult>({
              id,
              animal: null,
              missing: error instanceof HttpErrorResponse && error.status === 404,
            }),
          ),
        ),
      ),
    ).subscribe((results) => {
      this.loading.set(false);
      const missing = results.filter((result) => result.missing);
      if (missing.length > 0) {
        missing.forEach((result) => this.compare.remove(result.id));
        return;
      }
      if (results.some((result) => !result.animal)) {
        this.animals.set([]);
        this.error.set(true);
        return;
      }
      const animals = results.map((result) => result.animal!);
      this.loadedLanguage = language;
      animals.forEach((animal) => this.compare.rename(animal.id, animal.commonName));
      this.animals.set(animals);
    });
  }

  private syncUrl(ids: number[]): void {
    const value = ids.length === COMPARE_MAX ? ids.join(',') : null;
    if ((this.ids() ?? null) === value) return;
    this.router.navigate([], {
      queryParams: { ids: value },
      replaceUrl: true,
    });
  }

  swap(): void {
    this.compare.swap();
  }

  clear(): void {
    this.compare.clear();
  }

  remove(id: number): void {
    this.compare.remove(id);
  }

  removeLabel(animal: Animal): string {
    return this.i18n.t('compare.remove', { name: animal.commonName });
  }

  highlightLabel(kind: 'funFact' | 'profile'): string {
    return this.i18n.t(kind === 'funFact' ? 'detail.funFact' : 'detail.profile');
  }
}

export function parseIds(value: string | null | undefined): number[] {
  if (!value) return [];
  const ids = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  return Array.from(new Set(ids)).slice(0, COMPARE_MAX);
}
