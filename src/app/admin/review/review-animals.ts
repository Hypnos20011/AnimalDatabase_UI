import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Animal } from '../../animal-model/animal.model';
import { apiErrorMessage } from '../../shared/api-error';
import { AnimalService } from '../../shared/animal.service';
import { LanguageService } from '../../shared/i18n/language.service';
import { MissingTranslationCountService } from '../../shared/missing-translation-count.service';
import { wikimediaSrcset } from '../../shared/wikimedia-image';

@Component({
  selector: 'app-review-animals',
  imports: [DatePipe, RouterLink],
  templateUrl: './review-animals.html',
  styleUrl: './review-animals.css',
})
export class ReviewAnimals {
  private animals = inject(AnimalService);
  private translationCount = inject(MissingTranslationCountService);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(LanguageService);
  private loadRequest?: Subscription;
  readonly srcset = wikimediaSrcset;
  rows = signal<Animal[]>([]);
  displayRows = computed(() => this.rows().map((animal) => ({
    animal,
    metadata: [animal.scientificName, animal.family, animal.taxonomicClass, animal.habitatType]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' · '),
  })));
  loading = signal(true);
  loadError = signal('');
  actionError = signal('');
  busy = signal<number | null>(null);
  approving = signal<number | null>(null);
  rejecting = signal<number | null>(null);
  notes = signal<Record<number, string>>({});

  constructor() {
    this.load();
  }

  load(): void {
    this.loadRequest?.unsubscribe();
    this.loading.set(true);
    this.loadError.set('');
    this.loadRequest = this.animals.pendingReview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load the review list. Try again.');
        this.loading.set(false);
      },
    });
  }

  setNote(id: number, note: string): void {
    this.notes.update((notes) => ({ ...notes, [id]: note }));
  }

  approve(id: number): void {
    if (this.busy() !== null) return;
    this.approving.set(id);
    this.save(id, 'approve');
  }

  reject(id: number): void {
    if (this.busy() !== null || (this.notes()[id]?.length ?? 0) > 500) return;
    this.save(id, 'reject');
  }

  private save(id: number, action: 'approve' | 'reject'): void {
    this.busy.set(id);
    this.actionError.set('');
    const request = action === 'approve'
      ? this.animals.approve(id)
      : this.animals.reject(id, this.notes()[id] ?? '');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((row) => row.id !== id));
        this.busy.set(null);
        this.approving.set(null);
        this.rejecting.set(null);
        if (action === 'approve') this.translationCount.refresh();
      },
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        const fallback = 'Could not save the review. Try again.';
        this.actionError.set(
          status === 404 ? 'That animal no longer exists.' :
          status === 409 ? 'That animal was already reviewed.' :
          status === 403 ? this.i18n.t('admin.accessDenied') :
          status === 400 ? apiErrorMessage(error, fallback) : fallback,
        );
        this.busy.set(null);
        this.approving.set(null);
        if (status === 404 || status === 409) {
          this.rejecting.set(null);
          this.load();
        }
      },
    });
  }
}