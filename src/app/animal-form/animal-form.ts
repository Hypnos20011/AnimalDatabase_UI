import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnimalService } from '../animal.service';
import { NewAnimal, NewAnimalImage } from '../animal-model/animal.model';

@Component({
  selector: 'app-animal-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './animal-form.html',
  styleUrl: './animal-form.css',
})
export class AnimalForm {
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

  saving = signal(false);
  error = signal('');

  form = this.fb.group({
    commonName: ['', [Validators.required, Validators.maxLength(120)]],
    scientificName: ['', Validators.maxLength(150)],
    family: ['', Validators.maxLength(120)],
    taxonomicClass: [''],
    isDomesticated: [false],
    sizeLengthCmMin: [null as number | null, Validators.min(0)],
    sizeLengthCmMax: [null as number | null, Validators.min(0)],
    sizeHeightCmMin: [null as number | null, Validators.min(0)],
    sizeHeightCmMax: [null as number | null, Validators.min(0)],
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
    this.animalService.create(animal).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err.message ?? 'Could not save animal');
        this.saving.set(false);
      },
    });
  }

  imageUrl(key: string): string {
    return (this.form.get(key)?.value ?? '').trim();
  }

  imageInvalid(key: string): boolean {
    const control = this.form.get(key);
    return !!control && control.touched && control.invalid;
  }

  private collectImages(): NewAnimalImage[] {
    const images: NewAnimalImage[] = [];
    for (const field of this.imageFields) {
      const url = this.imageUrl(field.key);
      if (url) {
        images.push({ kind: field.kind, url, caption: field.label });
      }
    }
    return images;
  }

  private text(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
