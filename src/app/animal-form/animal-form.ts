import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
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

const oneDecimal: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const tenths = Number(value) * 10;
  return Math.abs(tenths - Math.round(tenths)) < 1e-6 ? null : { oneDecimal: true };
};

const wholeNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  return Number.isInteger(Number(value)) ? null : { wholeNumber: true };
};

const MAX_SIZE_CM = 999999.9;
const MAX_WEIGHT_KG = 9999999.99;
const MAX_LIFESPAN_YEARS = 2147483647;

const sizeRules = [Validators.min(0), Validators.max(MAX_SIZE_CM), oneDecimal];
const weightRules = [Validators.min(0), Validators.max(MAX_WEIGHT_KG)];
const lifespanRules = [Validators.min(0), Validators.max(MAX_LIFESPAN_YEARS), wholeNumber];

const RANGES = [
  ['sizeLengthCmMin', 'sizeLengthCmMax'],
  ['sizeHeightCmMin', 'sizeHeightCmMax'],
  ['weightKgMin', 'weightKgMax'],
  ['lifespanYearsMin', 'lifespanYearsMax'],
] as const;

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

  form = this.fb.group(
    {
      commonName: ['', [Validators.required, Validators.maxLength(120)]],
      scientificName: ['', Validators.maxLength(150)],
      family: ['', Validators.maxLength(120)],
      taxonomicClass: [''],
      isDomesticated: [false],
      sizeLengthCmMin: [null as number | null, sizeRules],
      sizeLengthCmMax: [null as number | null, sizeRules],
      sizeHeightCmMin: [null as number | null, sizeRules],
      sizeHeightCmMax: [null as number | null, sizeRules],
      weightKgMin: [null as number | null, weightRules],
      weightKgMax: [null as number | null, weightRules],
      lifespanYearsMin: [null as number | null, lifespanRules],
      lifespanYearsMax: [null as number | null, lifespanRules],
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
      sizeLengthCmMin: v.sizeLengthCmMin ?? null,
      sizeLengthCmMax: v.sizeLengthCmMax ?? null,
      sizeHeightCmMin: v.sizeHeightCmMin ?? null,
      sizeHeightCmMax: v.sizeHeightCmMax ?? null,
      weightKgMin: v.weightKgMin ?? null,
      weightKgMax: v.weightKgMax ?? null,
      lifespanYearsMin: v.lifespanYearsMin ?? null,
      lifespanYearsMax: v.lifespanYearsMax ?? null,
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
        next: () => {
          this.translationCount.refresh();
          this.router.navigate(id ? ['/animals', id] : ['/']);
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err, this.i18n.t('form.error.save')));
          this.saving.set(false);
        },
      });
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
    this.animalService.importFromWikipedia(url).subscribe({
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
      'sizeLengthCmMin',
      'sizeLengthCmMax',
      'weightKgMin',
      'weightKgMax',
      'lifespanYearsMin',
      'lifespanYearsMax',
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

  private createImageRow(): FormGroup {
    const row = this.fb.group({
      url: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
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
          sizeLengthCmMin: animal.sizeLengthCmMin,
          sizeLengthCmMax: animal.sizeLengthCmMax,
          sizeHeightCmMin: animal.sizeHeightCmMin,
          sizeHeightCmMax: animal.sizeHeightCmMax,
          weightKgMin: animal.weightKgMin,
          weightKgMax: animal.weightKgMax,
          lifespanYearsMin: animal.lifespanYearsMin,
          lifespanYearsMax: animal.lifespanYearsMax,
          iucnStatus: animal.iucnStatus ?? '',
          habitat: animal.habitat ?? '',
          habitatType: animal.habitatType ?? '',
          rangeRegion: animal.rangeRegion ?? '',
          profile: animal.profile ?? '',
          sourceUrl: animal.sourceUrl ?? '',
        });
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
