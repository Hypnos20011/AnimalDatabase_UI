import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminKeyService } from './admin-key.service';
import { AnimalService } from '../shared/animal.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
  protected admin = inject(AdminKeyService);
  protected translationCount = inject(MissingTranslationCountService);
  private animals = inject(AnimalService);
  private destroyRef = inject(DestroyRef);

  pendingCount = signal<number | null>(null);
  reviewLoadState = signal<'loading' | 'ready' | 'error'>('loading');
  reviewCountLabel = computed(() => {
    const count = this.pendingCount();
    if (count === null) return this.reviewLoadState() === 'loading' ? 'Review count is loading' : 'Review count is unavailable';
    return `${count} ${count === 1 ? 'animal' : 'animals'} waiting for review`;
  });
  translationCountLabel = computed(() => {
    const state = this.translationCount.state();
    if (state !== 'ready') return state === 'error' ? 'Translation count is unavailable' : 'Translation count is loading';
    const count = this.translationCount.count();
    return `${count} ${count === 1 ? 'animal' : 'animals'} with missing German or French text`;
  });

  constructor() {
    this.animals.pendingReview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (animals) => {
        this.pendingCount.set(animals.length);
        this.reviewLoadState.set('ready');
      },
      error: () => {
        this.pendingCount.set(null);
        this.reviewLoadState.set('error');
      },
    });
  }
}
