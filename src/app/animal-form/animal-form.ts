import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnimalService } from '../shared/animal.service';
import { Animal, NewAnimal, NewAnimalImage } from '../animal-model/animal.model';
import { WikipediaImport } from '../animal-model/wikipedia-import.model';
import { formatCount } from '../shared/plural';
import { isRateLimited, rateLimitMessage } from '../shared/rate-limit';

const oneDecimal: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const tenths = Number(value) * 10;
  return Math.abs(tenths - Math.round(tenths)) < 1e-6 ? null : { oneDecimal: true };
};

@Component({
  selector: 'app-animal-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './animal-form.html',
  styleUrl: './animal-form.css',
})
export class AnimalForm {
  id = input<string>();

  private fb = inject(FormBuilder);
  private animalService = inject(AnimalService);
  private router = inject(Router);

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

  readonly imageFields = [
    { key: 'maleImageUrl', kind: 'male', label: 'Male' },
    { key: 'femaleImageUrl', kind: 'female', label: 'Female' },
    { key: 'babyImageUrl', kind: 'baby', label: 'Baby' },
    { key: 'otherImageUrl', kind: 'unspecified', label: 'Other' },
  ] as const;

  editing = computed(() => !!this.id());
  loadingAnimal = signal(false);
  saving = signal(false);
  wikiUrl = signal('');
  importing = signal(false);
  importMessage = signal('');
  importError = signal('');
  importWarnings = signal<string[]>([]);
  private originalCaptions = new Map<string, string | null>();
  private importedImageUrl = '';
  private savedImageUrl = '';
  private savedScientificName = '';
  private importedValues = new Map<string, unknown>();
  error = signal('');

  form = this.fb.group({
    commonName: ['', [Validators.required, Validators.maxLength(120)]],
    scientificName: ['', Validators.maxLength(150)],
    family: ['', Validators.maxLength(120)],
    taxonomicClass: [''],
    isDomesticated: [false],
    sizeLengthCmMin: [null as number | null, [Validators.min(0), oneDecimal]],
    sizeLengthCmMax: [null as number | null, [Validators.min(0), oneDecimal]],
    sizeHeightCmMin: [null as number | null, [Validators.min(0), oneDecimal]],
    sizeHeightCmMax: [null as number | null, [Validators.min(0), oneDecimal]],
    weightKgMin: [null as number | null, Validators.min(0)],
    weightKgMax: [null as number | null, Validators.min(0)],
    lifespanYearsMin: [null as number | null, Validators.min(0)],
    lifespanYearsMax: [null as number | null, Validators.min(0)],
    iucnStatus: [''],
    habitat: ['', Validators.maxLength(255)],
    rangeRegion: ['', Validators.maxLength(255)],
    profile: [''],
    maleImageUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
    femaleImageUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
    babyImageUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
    otherImageUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/)]],
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
      }
      else{
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
      rangeRegion: this.text(v.rangeRegion),
      profile: this.text(v.profile),
      images: this.collectImages(),
    };

    this.saving.set(true);
    this.error.set('');
    const id = this.id();
    const request = id
      ? this.animalService.update(Number(id), animal)
      : this.animalService.create(animal);
    request.subscribe({
      next: () => this.router.navigate(id ? ['/animals', id] : ['/']),
      error: (err) => {
        this.error.set(err.message ?? 'Could not save animal');
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

  imageUrl(key: string): string {
    return (this.form.get(key)?.value ?? '').trim();
  }

  rangeInvalid(...keys: string[]): boolean {
    return keys.some((key) => {
      const control = this.form.get(key);
      return !!control && control.touched && control.invalid;
    });
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
            ? `Filled in ${formatCount(filled, { one: 'field', other: 'fields' })} from Wikipedia. Check them before saving.`
            : 'Wikipedia had nothing to fill in for this animal.',
        );
        this.importWarnings.set(data.warnings);
        this.importing.set(false);
      },
      error: (err) => {
        this.importError.set(
          isRateLimited(err)
            ? rateLimitMessage(err, 'lookups')
            : typeof err.error === 'string' && err.error
              ? err.error
              : 'Could not load that Wikipedia page.',
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
    const imageControl = this.form.controls.otherImageUrl;
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
      if (next) filled++;
    }
    return filled;
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
          rangeRegion: animal.rangeRegion ?? '',
          profile: animal.profile ?? '',
        });
        this.originalCaptions.clear();

        for (const field of this.imageFields) {
          const image = images.find((i) => i.kind === field.kind);
          this.form.get(field.key)?.setValue(image?.url ?? '');
          if (image) this.originalCaptions.set(image.url, image.caption);
        }
        this.savedScientificName = animal.scientificName ?? '';
        this.savedImageUrl = this.form.controls.otherImageUrl.value ?? '';

        this.loadingAnimal.set(false);
      },
      error: () => {
        this.error.set('Could not load this animal.');
        this.loadingAnimal.set(false);
      },
    });
  }

  private collectImages(): NewAnimalImage[] {
    const images: NewAnimalImage[] = [];
    for (const field of this.imageFields) {
      const url = this.imageUrl(field.key);
      if (url) {
        const caption = this.originalCaptions.has(url)
          ? this.originalCaptions.get(url)!
          : field.label;
        images.push({ kind: field.kind, url, caption });
      }
    }
    return images;
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
