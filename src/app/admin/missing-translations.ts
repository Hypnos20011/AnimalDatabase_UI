import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { TranslationEditor } from './translation-editor/translation-editor';
import { AnimalService, MissingTranslation } from '../shared/animal.service';
import { isPublicAnimal } from '../shared/animal-status';
import { LanguageService } from '../shared/i18n/language.service';
import { TranslationKey } from '../shared/i18n/en';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

@Component({
  selector: 'app-missing-translations',
  imports: [RouterLink, TranslationEditor],
  templateUrl: './missing-translations.html',
  styleUrl: './missing-translations.css',
})
export class MissingTranslations {
  private animals = inject(AnimalService);
  private translationCount = inject(MissingTranslationCountService);
  protected i18n = inject(LanguageService);

  allAnimals = signal<Animal[]>([]);
  rows = signal<MissingTranslation[]>([]);
  editing = signal<MissingTranslation | null>(null);
  entries = computed(() =>
    this.allAnimals()
      .filter(isPublicAnimal)
      .map((animal) => {
        const row = this.rows().find((candidate) => candidate.id === animal.id);
        return {
          id: animal.id,
          commonName: animal.commonName,
          languages: row?.languages ?? [],
        };
      })
      .sort((a, b) => {
        const missingDifference = Number(b.languages.length > 0) - Number(a.languages.length > 0);
        return missingDifference || a.commonName.localeCompare(b.commonName);
      }),
  );
  loading = signal(true);
  error = signal('');
  busy = signal<number | null>(null);

  constructor() {
    this.load();
  }

  languageLabel(language: string): string {
    const key = `admin.missing.language.${language}` as TranslationKey;
    return language === 'de' || language === 'fr' ? this.i18n.t(key) : language;
  }

  fieldLabel(field: string): string {
    const key = `admin.missing.field.${field}` as TranslationKey;
    return field in
      {
        commonName: 1,
        habitat: 1,
        rangeRegion: 1,
        profile: 1,
      }
      ? this.i18n.t(key)
      : field;
  }

  fields(names: string[]): string {
    return names.map((name) => this.fieldLabel(name)).join(', ');
  }

  translate(animal: MissingTranslation): void {
    if (this.busy() !== null) return;
    this.busy.set(animal.id);
    this.error.set('');
    this.animals.translateMissing(animal.id).subscribe({
      next: (updated) => {
        this.rows.update((rows) =>
          updated.languages.length === 0
            ? rows.filter((row) => row.id !== animal.id)
            : rows.map((row) => (row.id === animal.id ? updated : row)),
        );
        this.busy.set(null);
        this.translationCount.refresh();
      },
      error: (error: unknown) => {
        this.error.set(
          this.i18n.t(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'admin.accessDenied'
              : 'admin.missing.error',
          ),
        );
        this.busy.set(null);
      },
    });
  }

  onEditorSaved(): void {
    this.editing.set(null);
    this.translationCount.refresh();
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ all: this.animals.getAll(), missing: this.animals.missingTranslations() }).subscribe({
      next: ({ all, missing }) => {
        this.allAnimals.set(all);
        this.rows.set(missing);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(
          this.i18n.t(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'admin.accessDenied'
              : 'admin.missing.error',
          ),
        );
        this.loading.set(false);
      },
    });
  }
}
