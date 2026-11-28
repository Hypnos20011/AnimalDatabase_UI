import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnimalService } from '../shared/animal.service';
import { Animal, NewAnimal, NewAnimalImage } from '../animal-model/animal.model';
import { WikipediaImport } from '../animal-model/wikipedia-import.model';
import { HttpErrorResponse } from '@angular/common/http';
import { isRateLimited, retryAfterSeconds } from '../shared/rate-limit';
import { LanguageService } from '../shared/i18n/language.service';
import { apiErrorMessage } from '../shared/api-error';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';
import {
  chooseDisplayUnit,
  convertUnit,
  fromCanonical,
  maxInUnit,
  MeasurementKind,
  MeasurementUnit,
  toCanonical,
} from '../shared/unit-conversion';

const MEASUREMENTS: Record<
  MeasurementKind,
  { min: string; max: string; unit: string }
> = {
  length: { min: 'lengthMin', max: 'lengthMax', unit: 'lengthUnit' },
  height: { min: 'heightMin', max: 'heightMax', unit: 'heightUnit' },
  weight: { min: 'weightMin', max: 'weightMax', unit: 'weightUnit' },
  lifespan: { min: 'lifespanMin', max: 'lifespanMax', unit: 'lifespanUnit' },
};

const rangeRules = (kind: MeasurementKind): ValidatorFn[] => [
  Validators.min(0),
  (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    const unit = control.parent?.get(MEASUREMENTS[kind].unit)?.value as MeasurementUnit | undefined;
    if (unit === undefined) return null;
    const actual = Number(value);
    if (actual > 0 && toCanonical(actual, kind, unit) === 0) return { tooSmallToStore: true };
    const max = maxInUnit(kind, unit);
    return actual > max ? { max: { max, actual } } : null;
  },
];

const RANGES = Object.values(MEASUREMENTS).map(({ min, max }) => [min, max] as const);

const roundInputValue = (value: number | null): number | null =>
  value === null ? null : Number(value.toPrecision(10));

const minNotAboveMax: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const reversed = RANGES.filter(([min, max]) => {
    const low = group.get(min)?.value;
    const high = group.get(max)?.value;
    return low !== null && low !== '' && high !== null && high !== '' && Number(low) > Number(high);
  }).map(([min]) => min as string);
  return reversed.length > 0 ? { minAboveMax: reversed } : null;
};

@Component({
  selector: 'app-animal-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './animal-form.html',
  styleUrl: './animal-form.css',
})
export class AnimalForm {
  id = input<string>();

  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private animalService = inject(AnimalService);
  private translationCount = inject(MissingTranslationCountService);
  private router = inject(Router);
  protected i18n = inject(LanguageService);

  readonly classes = ['mammal', 'bird', 'reptile', 'amphibian', 'fish', 'invertebrate'];
  readonly statuses = [
    'least concern',
    'near threatened',
    'vulnerable',
    'endangered',
    'critically endangered',
    'extinct in the wild',
    'extinct',
    'data deficient',
  ];

  readonly habitatTypes = [
    'forest',
    'grassland',
    'desert',
    'mountains',
    'wetland',
    'freshwater',
    'ocean',
    'deep sea',
    'underground',
  ];

  editing = computed(() => !!this.id());
  loadingAnimal = signal(false);
  saving = signal(false);
  submittedPending = signal<Animal | null>(null);
  wikiUrl = signal('');
  importing = signal(false);
  importMessage = signal('');
  importError = signal('');
  importWarnings = signal<string[]>([]);
  error = signal('');

  private originalCaptions = new Map<string, string | null>();
  private importedImageUrl = '';
  private savedImageUrl = '';
  private savedScientificName = '';
  private importedValues = new Map<string, unknown>();
  private cancelImports = new Subject<void>();
  private activeUnits: Record<MeasurementKind, MeasurementUnit> = {
    length: 'cm',
    height: 'cm',
    weight: 'kg',
    lifespan: 'year',
  };

  form = this.fb.group(
    {
      commonName: ['', [Validators.required, Validators.maxLength(120)]],
      scientificName: ['', Validators.maxLength(150)],
      family: ['', Validators.maxLength(120)],
      taxonomicClass: [''],
      isDomesticated: [false],
      lengthMin: [null as number | null, rangeRules('length')],
      lengthMax: [null as number | null, rangeRules('length')],
      lengthUnit: ['cm' as MeasurementUnit],
      heightMin: [null as number | null, rangeRules('height')],
      heightMax: [null as number | null, rangeRules('height')],
      heightUnit: ['cm' as MeasurementUnit],
      weightMin: [null as number | null, rangeRules('weight')],
      weightMax: [null as number | null, rangeRules('weight')],
      weightUnit: ['kg' as MeasurementUnit],
      lifespanMin: [null as number | null, rangeRules('lifespan')],
      lifespanMax: [null as number | null, rangeRules('lifespan')],
      lifespanUnit: ['year' as MeasurementUnit],
      iucnStatus: [''],
      habitat: ['', Validators.maxLength(255)],
      habitatType: ['', Validators.maxLength(30)],
      rangeRegion: ['', Validators.maxLength(255)],
      profile: ['', Validators.maxLength(20000)],
      sourceUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https:\/\/\S+$/)]],
      images: this.fb.array([this.createImageRow()]),
    },
    { validators: minNotAboveMax },
  );
  private readonly initialFormValue = this.form.getRawValue();
  private imageRowsValue = toSignal(this.imageRows.valueChanges, {
    initialValue: this.imageRows.value,
  });

  private existingAnimals = signal<Animal[]>([]);
  private commonNameValue = toSignal(this.form.controls.commonName.valueChanges, {
    initialValue: '',
  });
  private scientificNameValue = toSignal(this.form.controls.scientificName.valueChanges, {
    initialValue: '',
  });

  duplicates = computed(() => {
    const common = this.normalize(this.commonNameValue());
    const scientific = this.normalize(this.scientificNameValue());
    if (!common && !scientific) return [];
    const currentId = Number(this.id());
    return this.existingAnimals().filter(
      (a) =>
        a.id !== currentId &&
        ((!!common && this.normalize(a.commonName) === common) ||
          (!!scientific && this.normalize(a.scientificName) === scientific)),
    );
  });

  constructor() {
    this.animalService.getAll().subscribe({
      next: (animals) => this.existingAnimals.set(animals),
    });
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (id) this.loadAnimal(Number(id));
      });
    });
    this.form.controls.isDomesticated.valueChanges.subscribe((isDomesticated) => {
      if (isDomesticated) {
        this.form.controls.iucnStatus.setValue('');
        this.form.controls.iucnStatus.disable();
      } else {
        this.form.controls.iucnStatus.enable();
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const animal: NewAnimal = {
      commonName: (v.commonName ?? '').trim(),
      scientificName: this.text(v.scientificName),
      family: this.text(v.family),
      taxonomicClass: this.text(v.taxonomicClass),
      isDomesticated: !!v.isDomesticated,
      lengthMmMin: this.canonical(v.lengthMin, 'length', v.lengthUnit ?? 'cm'),
      lengthMmMax: this.canonical(v.lengthMax, 'length', v.lengthUnit ?? 'cm'),
      heightMmMin: this.canonical(v.heightMin, 'height', v.heightUnit ?? 'cm'),
      heightMmMax: this.canonical(v.heightMax, 'height', v.heightUnit ?? 'cm'),
      weightGramsMin: this.canonical(v.weightMin, 'weight', v.weightUnit ?? 'kg'),
      weightGramsMax: this.canonical(v.weightMax, 'weight', v.weightUnit ?? 'kg'),
      lifespanMonthsMin: this.canonical(v.lifespanMin, 'lifespan', v.lifespanUnit ?? 'year'),
      lifespanMonthsMax: this.canonical(v.lifespanMax, 'lifespan', v.lifespanUnit ?? 'year'),
      iucnStatus: this.text(v.iucnStatus),
      habitat: this.text(v.habitat),
      habitatType: this.text(v.habitatType),
      rangeRegion: this.text(v.rangeRegion),
      profile: this.text(v.profile),
      sourceUrl: this.text(v.sourceUrl),
      images: this.collectImages(),
    };

    this.saving.set(true);
    this.error.set('');
    const id = this.id();
    const request = id
      ? this.animalService.update(Number(id), animal)
      : this.animalService.create(animal);
    request.subscribe({
      next: (result) => {
        this.translationCount.refresh();
        if (!id && result?.status === 'pending') {
          this.cancelImports.next();
          this.importing.set(false);
          this.saving.set(false);
          this.submittedPending.set(result);
        } else {
          this.router.navigate(id ? ['/animals', id] : ['/']);
        }
      },
      error: (err) => {
        this.error.set(
          err instanceof HttpErrorResponse && err.status === 403
            ? this.i18n.t('admin.accessDenied')
            : apiErrorMessage(err, this.i18n.t('form.error.save')),
        );
        this.saving.set(false);
      },
    });
  }

  addAnother(): void {
    this.cancelImports.next();
    this.imageRows.clear();
    this.imageRows.push(this.createImageRow());
    this.form.reset(this.initialFormValue);
    this.activeUnits = {
      length: 'cm',
      height: 'cm',
      weight: 'kg',
      lifespan: 'year',
    };
    this.originalCaptions.clear();
    this.importedValues.clear();
    this.importedImageUrl = '';
    this.savedImageUrl = '';
    this.savedScientificName = '';
    this.failedPreviews.set(new Set());
    this.wikiUrl.set('');
    this.importing.set(false);
    this.importMessage.set('');
    this.importError.set('');
    this.importWarnings.set([]);
    this.error.set('');
    this.submittedPending.set(null);
  }

  private failedPreviews = signal<ReadonlySet<string>>(new Set());

  previewFailed(url: string): boolean {
    return this.failedPreviews().has(url);
  }

  markPreviewFailed(url: string): void {
    this.failedPreviews.update((urls) => new Set(urls).add(url));
  }

  canPreviewImage(key: string): boolean {
    this.imageRowsValue();
    const control = this.form.get(key);
    return !!control?.value && control.valid;
  }

  imageUrl(key: string): string {
    this.imageRowsValue();
    return (this.form.get(key)?.value ?? '').trim();
  }

  rangeInvalid(...keys: string[]): boolean {
    return keys.some((key) => {
      const control = this.form.get(key);
      return !!control && control.touched && control.invalid;
    });
  }

  rangeReversed(minKey: string): boolean {
    const reversed: string[] = this.form.errors?.['minAboveMax'] ?? [];
    return reversed.includes(minKey);
  }

  rangeErrorText(...keys: string[]): string {
    const tooSmall = keys.some((key) => {
      const control = this.form.get(key);
      return !!control && control.touched && control.hasError('tooSmallToStore');
    });
    return tooSmall
      ? 'Too small to store; use a smaller unit.'
      : 'Enter a valid range; the minimum must not exceed the maximum.';
  }

  changeUnit(kind: MeasurementKind): void {
    const config = MEASUREMENTS[kind];
    const previousUnit = this.activeUnits[kind];
    const nextUnit = this.form.get(config.unit)?.value as MeasurementUnit;
    if (previousUnit === nextUnit) return;
    for (const key of [config.min, config.max]) {
      const control = this.form.get(key);
      const value = control?.value;
      if (control && value !== null && value !== '') {
        control.setValue(roundInputValue(convertUnit(Number(value), kind, previousUnit, nextUnit)));
      }
    }
    this.activeUnits[kind] = nextUnit;
  }

  imageInvalid(key: string): boolean {
    const control = this.form.get(key);
    return !!control && control.touched && control.invalid;
  }

  importFromWikipedia(): void {
    const url = this.wikiUrl().trim();
    if (!url) return;
    this.importing.set(true);
    this.importMessage.set('');
    this.importError.set('');
    this.importWarnings.set([]);
    this.animalService
      .importFromWikipedia(url)
      .pipe(takeUntil(this.cancelImports), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const filled = this.applyImport(data);
          this.importMessage.set(
            filled > 0
              ? this.i18n.tPlural('form.wiki.filled', filled)
              : this.i18n.t('form.wiki.nothing'),
          );
          this.importWarnings.set(data.warnings);
          this.importing.set(false);
        },
        error: (err) => {
          this.importError.set(
            isRateLimited(err)
              ? this.rateLimitText(err, 'form.rateLimit.lookups')
              : typeof err.error === 'string' && err.error
                ? err.error
                : this.i18n.t('form.wiki.error'),
          );
          this.importing.set(false);
        },
      });
  }

  private applyImport(data: WikipediaImport): number {
    const keys = [
      'commonName',
      'scientificName',
      'family',
      'taxonomicClass',
      'iucnStatus',
      'habitat',
      'rangeRegion',
      'profile',
    ] as const;
    let filled = 0;
    for (const key of keys) {
      const control = this.form.get(key);
      if (!control) continue;
      const value = data[key];
      if (value !== null && value !== undefined && value !== '') {
        control.setValue(value as never);
        this.importedValues.set(key, value);
        filled++;
      } else if (this.importedValues.has(key)) {
        const previous = this.importedValues.get(key);
        if (this.sameValue(control.value, previous)) {
          control.setValue((typeof previous === 'number' ? null : '') as never);
        }
        this.importedValues.delete(key);
      }
    }
    filled += this.applyMeasurementImport('length', data.lengthMmMin ?? null, data.lengthMmMax ?? null);
    filled += this.applyMeasurementImport('height', data.heightMmMin ?? null, data.heightMmMax ?? null);
    filled += this.applyMeasurementImport('weight', data.weightGramsMin ?? null, data.weightGramsMax ?? null);
    filled += this.applyMeasurementImport('lifespan', data.lifespanMonthsMin ?? null, data.lifespanMonthsMax ?? null);
    if (data.sourceUrl) this.form.controls.sourceUrl.setValue(data.sourceUrl);
    const firstRow = this.imageRows.at(0);
    const imageControl = firstRow.get('url');

    if (!imageControl) return filled;
    const current = (imageControl.value ?? '').trim();

    if (
      !current ||
      current === this.importedImageUrl ||
      (current === this.savedImageUrl && (data.scientificName ?? '') !== this.savedScientificName)
    ) {
      const next = (data.imageUrl ?? '').trim();
      if (next !== current) {
        imageControl.setValue(next);
        imageControl.markAsUntouched();
        this.failedPreviews.update((urls) => {
          const remaining = new Set(urls);
          remaining.delete(next);
          return remaining;
        });
      }
      this.importedImageUrl = next;
      if (next) {
        filled++;
        const attribution = (data.attribution ?? '').trim();
        const sourcePageUrl = (data.sourcePageUrl ?? '').trim();
        firstRow.get('attribution')?.setValue(attribution);
        firstRow.get('sourcePageUrl')?.setValue(sourcePageUrl);
        if (attribution) filled++;
        if (sourcePageUrl) filled++;
      } else {
        firstRow.get('attribution')?.setValue('');
        firstRow.get('sourcePageUrl')?.setValue('');
      }
    }
    return filled;
  }

  private applyMeasurementImport(
    kind: MeasurementKind,
    min: number | null,
    max: number | null,
  ): number {
    const config = MEASUREMENTS[kind];
    for (const [key, value] of [[config.min, min], [config.max, max]] as const) {
      if (value === null && this.importedValues.has(key)) {
        const previous = this.importedValues.get(key) as number;
        const displayedPrevious = roundInputValue(fromCanonical(previous, kind, this.activeUnits[kind]));
        const control = this.form.get(key);
        if (this.sameValue(control?.value, displayedPrevious)) control?.setValue(null);
        this.importedValues.delete(key);
      }
    }
    if (min === null && max === null) return 0;

    const unit = chooseDisplayUnit(kind, min, max);
    this.form.get(config.unit)?.setValue(unit);
    this.changeUnit(kind);
    let filled = 0;
    for (const [key, value] of [[config.min, min], [config.max, max]] as const) {
      if (value !== null) {
        this.form.get(key)?.setValue(roundInputValue(fromCanonical(value, kind, unit)));
        this.importedValues.set(key, value);
        filled++;
      }
    }
    return filled;
  }

  private setMeasurementValues(kind: MeasurementKind, min: number | null, max: number | null): void {
    const config = MEASUREMENTS[kind];
    const unit = chooseDisplayUnit(kind, min, max);
    this.form.get(config.unit)?.setValue(unit);
    this.activeUnits[kind] = unit;
    this.form.get(config.min)?.setValue(roundInputValue(fromCanonical(min, kind, unit)));
    this.form.get(config.max)?.setValue(roundInputValue(fromCanonical(max, kind, unit)));
  }

  private canonical(value: number | null, kind: MeasurementKind, unit: MeasurementUnit): number | null {
    return value === null ? null : toCanonical(value, kind, unit);
  }

  private createImageRow(): FormGroup {
    const row = this.fb.group({
      url: ['', [Validators.maxLength(500), Validators.pattern(/^https:\/\/\S+$/)]],
      attribution: ['', [Validators.maxLength(500)]],
      sourcePageUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https:\/\/\S+$/)]],
    });
    const urlControl = row.get('url');
    let previousUrl = String(urlControl?.value ?? '');
    urlControl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value: string | null) => {
      const url = value ?? '';
      this.failedPreviews.update((failed) => {
        const updated = new Set(failed);
        updated.delete(previousUrl);
        updated.delete(url);
        return updated;
      });
      previousUrl = url;
    });
    return row;
  }

  addImageRow(): void {
    this.imageRows.push(this.createImageRow());
  }

  removeImageRow(index: number): void {
    if (index > 0 && index < this.imageRows.length) {
      this.imageRows.removeAt(index);
    }
  }

  get imageRows(): FormArray {
    return this.form.get('images') as FormArray;
  }

  private loadAnimal(id: number): void {
    this.loadingAnimal.set(true);
    this.error.set('');
    forkJoin({
      animal: this.animalService.getById(id),
      images: this.animalService.getImages(id),
    }).subscribe({
      next: ({ animal, images }) => {
        this.form.patchValue({
          commonName: animal.commonName,
          scientificName: animal.scientificName ?? '',
          family: animal.family ?? '',
          taxonomicClass: animal.taxonomicClass ?? '',
          isDomesticated: animal.isDomesticated,
          iucnStatus: animal.iucnStatus ?? '',
          habitat: animal.habitat ?? '',
          habitatType: animal.habitatType ?? '',
          rangeRegion: animal.rangeRegion ?? '',
          profile: animal.profile ?? '',
          sourceUrl: animal.sourceUrl ?? '',
        });
        this.setMeasurementValues('length', animal.lengthMmMin, animal.lengthMmMax);
        this.setMeasurementValues('height', animal.heightMmMin, animal.heightMmMax);
        this.setMeasurementValues('weight', animal.weightGramsMin, animal.weightGramsMax);
        this.setMeasurementValues('lifespan', animal.lifespanMonthsMin, animal.lifespanMonthsMax);
        this.originalCaptions.clear();
        this.imageRows.clear();
        for (const image of images) {
          const row = this.createImageRow();
          row.patchValue({
            url: image.url,
            attribution: image.attribution ?? '',
            sourcePageUrl: image.sourcePageUrl ?? '',
          });
          this.imageRows.push(row);
          this.originalCaptions.set(image.url, image.caption);
        }
        if (this.imageRows.length === 0) this.imageRows.push(this.createImageRow());

        this.savedScientificName = animal.scientificName ?? '';
        this.savedImageUrl = this.imageRows.at(0).get('url')?.value ?? '';
        this.failedPreviews.set(new Set());

        this.loadingAnimal.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('form.error.load'));
        this.failedPreviews.set(new Set());
        this.loadingAnimal.set(false);
      },
    });
  }

  private collectImages(): NewAnimalImage[] {
    const images: NewAnimalImage[] = [];
    for (const field of this.imageRows.controls) {
      const url = this.text(field.get('url')?.value as string | null);
      if (url != null) {
        const caption = this.originalCaptions.has(url) ? this.originalCaptions.get(url)! : null;
        images.push({
          kind: 'unspecified',
          url,
          caption,
          attribution: this.text(field.get('attribution')?.value as string | null),
          sourcePageUrl: this.text(field.get('sourcePageUrl')?.value as string | null),
        });
      }
    }
    return images;
  }

  private rateLimitText(err: HttpErrorResponse, key: 'form.rateLimit.lookups'): string {
    const seconds = retryAfterSeconds(err);
    const when =
      seconds === null
        ? this.i18n.t('form.rateLimit.inMinute')
        : this.i18n.tPlural('form.rateLimit.inSeconds', seconds);
    return this.i18n.t(key, { when });
  }

  private sameValue(a: unknown, b: unknown): boolean {
    return String(a ?? '').trim() === String(b ?? '').trim();
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private text(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed.length > 0 ? trimmed : null;
  }

}
