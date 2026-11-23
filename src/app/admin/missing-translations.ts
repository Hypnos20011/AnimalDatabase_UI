import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimalService, MissingTranslation } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { TranslationKey } from '../shared/i18n/en';

@Component({
  selector: 'app-missing-translations',
  imports: [RouterLink],
  templateUrl: './missing-translations.html',
  styleUrl: './missing-translations.css',
})
export class MissingTranslations {
  private animals = inject(AnimalService);
  protected i18n = inject(LanguageService);

  rows = signal<MissingTranslation[]>([]);
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
      },
      error: () => {
        this.error.set(this.i18n.t('admin.missing.error'));
        this.busy.set(null);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.animals.missingTranslations().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('admin.missing.error'));
        this.loading.set(false);
      },
    });
  }
}
