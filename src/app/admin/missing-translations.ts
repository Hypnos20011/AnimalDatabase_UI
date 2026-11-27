import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TranslationEditor } from './translation-editor/translation-editor';
import { AnimalService, MissingTranslation } from '../shared/animal.service';
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

  rows = signal<MissingTranslation[]>([]);
  editing = signal<MissingTranslation | null>(null);
  entries = computed(() =>
    [...this.rows()].sort((a, b) => a.commonName.localeCompare(b.commonName)),
  );
  loading = signal(true);
  error = signal('');
  busy = signal<number | null>(null);
  private hasLoaded = false;

  constructor() {
    this.load();
  }

  languageLabel(language: string): string {
    if (language === 'de') return 'German';
    if (language === 'fr') return 'French';
    return language;
  }

  fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      commonName: 'name',
      habitat: 'habitat',
      rangeRegion: 'range',
      profile: 'profile',
    };
    return labels[field] ?? field;
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
        this.error.set(error instanceof HttpErrorResponse && error.status === 403
          ? 'You do not have permission to perform this action.'
          : 'Could not translate missing fields.');
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
    if (!this.hasLoaded) this.loading.set(true);
    this.error.set('');
    this.animals.missingTranslations().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
        this.hasLoaded = true;
      },
      error: (error: unknown) => {
        this.error.set(error instanceof HttpErrorResponse && error.status === 403
          ? 'You do not have permission to perform this action.'
          : 'Could not load missing translations.');
        this.loading.set(false);
        this.hasLoaded = true;
      },
    });
  }
}
