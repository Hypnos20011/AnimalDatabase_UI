import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { AnimalImage } from '../animal-model/animal-image.model';
import { formatMeasurementRange, MeasurementKind } from '../shared/unit-conversion';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { sameName, wikimediaSrcset } from '../shared/wikimedia-image';
import { AdminKeyService } from '../admin/admin-key.service';
import { Language } from '../shared/i18n/languages';
import { LanguageService } from '../shared/i18n/language.service';
import { RecentlyViewedService } from '../animals-list/recently-viewed.service';
import { FavoritesService } from '../animals-list/favorites.service';
import { splitProfile } from '../shared/profile';
import { CompareService } from '../compare/compare.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';
import { animalStatusLabel, isPublicAnimal } from '../shared/animal-status';

export const SHARE_STATUS_MS = 3000;

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule, RouterLink, ConfirmDialog],
  templateUrl: './animal-detail.html',
  styleUrl: './animal-detail.css',
})
export class AnimalDetail {
  readonly srcset = wikimediaSrcset;

  measurement(min: number | null, max: number | null, kind: MeasurementKind): string {
    return formatMeasurementRange(min, max, kind, this.i18n.language(), {
      month: { one: this.i18n.t('unit.month'), other: this.i18n.t('unit.months') },
      year: { one: this.i18n.t('unit.year'), other: this.i18n.t('unit.years') },
    }, {
      upTo: this.i18n.t('range.upTo'),
      atLeast: this.i18n.t('range.atLeast'),
    });
  }

  showCaption(img: AnimalImage): boolean {
    const animal = this.animal();
    return (
      !!img.caption?.trim() && !sameName(img.caption, animal?.commonName, animal?.scientificName)
    );
  }
  id = input.required<string>();

  private animalService = inject(AnimalService);
  private router = inject(Router);
  private title = inject(Title);
  private animalRequest?: Subscription;
  private imagesRequest?: Subscription;
  private deleteRequest?: Subscription;
  private loadedId?: number;
  private loadedKey?: string | null;
  protected admin = inject(AdminKeyService);
  protected i18n = inject(LanguageService);
  private recentlyViewed = inject(RecentlyViewedService);
  private favorites = inject(FavoritesService);
  protected compare = inject(CompareService);
  private translationCount = inject(MissingTranslationCountService);

  animal = signal<Animal | null>(null);
  statusLabel = computed(() => animalStatusLabel(this.animal()?.status));
  canEdit = computed(() => {
    const animal = this.animal();
    return !!animal && (this.admin.role() === 'admin' ||
      (this.admin.role() === 'tester' && animal.status === 'pending'));
  });
  canDelete = computed(() => {
    const animal = this.animal();
    return !!animal && (this.admin.role() === 'admin' ||
      (this.admin.role() === 'tester' && animal.status === 'pending' && animal.submittedBy === 'tester'));
  });
  loading = signal(true);
  images = signal<AnimalImage[]>([]);
  heroImage = computed(() => this.images()[0] ?? null);
  moreImages = computed(() => this.images().slice(1));
  heroFailed = signal(false);
  noPhoto = computed(() => !this.imagesLoading() && (!this.heroImage() || this.heroFailed()));

  private profileParts = computed(() => splitProfile(this.animal()?.profile));
  profileText = computed(() => this.profileParts().text);
  funFact = computed(() => this.profileParts().funFact);
  isFavorite = computed(() => {
    const animal = this.animal();
    return !!animal && this.favorites.ids().has(animal.id);
  });
  favoriteLabel = computed(() =>
    this.i18n.t(this.isFavorite() ? 'favorites.remove' : 'favorites.add', {
      name: this.animal()?.commonName ?? '',
    }),
  );
  isCompared = computed(() => {
    const animal = this.animal();
    return !!animal && this.compare.ids().includes(animal.id);
  });
  compareLabel = computed(() =>
    this.i18n.t(this.isCompared() ? 'compare.remove' : 'compare.add', {
      name: this.animal()?.commonName ?? '',
    }),
  );
  compareHint = computed(() => {
    if (!this.isCompared()) return null;
    const selection = this.compare.selection();
    if (this.compare.ready()) {
      return {
        ready: true,
        text: this.i18n.t('compare.ready', {
          a: selection[0].commonName,
          b: selection[1].commonName,
        }),
      };
    }
    return { ready: false, text: this.i18n.t('compare.selected', { count: selection.length }) };
  });
  shareLabel = computed(() => this.i18n.t('detail.share', { name: this.animal()?.commonName ?? '' }));
  printLabel = computed(() => this.i18n.t('detail.print', { name: this.animal()?.commonName ?? '' }));
  shareStatus = signal<'copied' | 'error' | null>(null);
  shareMessage = computed(() => {
    const status = this.shareStatus();
    if (status === 'copied') return this.i18n.t('detail.share.copied');
    if (status === 'error') return this.i18n.t('detail.share.error');
    return '';
  });
  private shareStatusTimer?: ReturnType<typeof setTimeout>;
  imagesLoading = signal(true);
  showDetails = signal(false);
  confirmOpen = signal(false);
  deleting = signal(false);
  deleteError = signal('');
  deleteTitle = computed(() =>
    this.i18n.t('detail.delete.title', {
      name: this.animal()?.commonName ?? this.i18n.t('detail.delete.thisAnimal'),
    }),
  );
  deleteMessage = computed(() => this.i18n.t('detail.delete.message'));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.shareStatusTimer);
      this.animalRequest?.unsubscribe();
      this.imagesRequest?.unsubscribe();
      this.deleteRequest?.unsubscribe();
    });
    effect(() => {
      const id = Number(this.id());
      const language = this.i18n.language();
      const key = this.admin.key();
      untracked(() => this.load(id, language, key));
    });
  }

  load(id: number, language: Language, key: string | null): void {
    const keyChangedForSameAnimal = this.loadedId === id && this.loadedKey !== undefined && this.loadedKey !== key;
    const changedView = this.loadedId !== id || this.loadedKey !== key;
    this.loadedId = id;
    this.loadedKey = key;
    if (changedView) {
      this.deleteRequest?.unsubscribe();
      this.confirmOpen.set(false);
      this.deleting.set(false);
      this.deleteError.set('');
      this.loading.set(true);
      this.animal.set(null);
      this.images.set([]);
      this.showDetails.set(false);
      this.setShareStatus(null);
      this.title.setTitle('Unusual Animals');
      this.loadImages(id, key);
    }
    this.animalRequest?.unsubscribe();
    this.animalRequest = this.animalService.getById(id, language).subscribe({
      next: (data) => {
        if (!this.isCurrentView(id, key) || this.i18n.language() !== language) return;
        this.animal.set(data);
        if (isPublicAnimal(data)) this.recentlyViewed.record(data.id, data.commonName);
        this.compare.rename(data.id, data.commonName);
        this.title.setTitle(`${data.commonName} · Unusual Animals`);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (!this.isCurrentView(id, key) || this.i18n.language() !== language) return;
        this.animal.set(null);
        this.title.setTitle('Unusual Animals');
        this.loading.set(false);
        if (keyChangedForSameAnimal && error instanceof HttpErrorResponse && error.status === 404) {
          this.router.navigate(['/'], { replaceUrl: true });
        }
      },
    });
  }

  private isCurrentView(id: number, key: string | null): boolean {
    return Object.is(Number(this.id()), id) && this.admin.key() === key;
  }

  loadImages(animalId: number, key: string | null): void {
    this.imagesLoading.set(true);
    this.heroFailed.set(false);
    this.imagesRequest?.unsubscribe();
    this.imagesRequest = this.animalService.getImages(animalId).subscribe({
      next: (data) => {
        if (!this.isCurrentView(animalId, key)) return;
        this.images.set(data);
        this.imagesLoading.set(false);
      },
      error: () => {
        if (!this.isCurrentView(animalId, key)) return;
        this.images.set([]);
        this.imagesLoading.set(false);
      },
    });
  }

  onHeroError(): void {
    this.heroFailed.set(true);
  }

  toggleFavorite(): void {
    const animal = this.animal();
    if (!animal) return;
    this.favorites.toggle(animal.id, animal.commonName);
  }

  toggleCompare(): void {
    const animal = this.animal();
    if (!animal) return;
    this.compare.toggle(animal.id, animal.commonName);
  }

  async share(): Promise<void> {
    const animal = this.animal();
    if (!animal) return;
    const url = window.location.href;
    const data: ShareData = {
      title: animal.commonName,
      text: this.i18n.t('detail.share.text', { name: animal.commonName }),
      url,
    };
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        this.setShareStatus(null);
        return;
      } catch (error) {
        if ((error as Error | undefined)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      this.setShareStatus('copied');
    } catch {
      this.setShareStatus('error');
    }
  }

  print(): void {
    window.print();
  }

  private setShareStatus(status: 'copied' | 'error' | null): void {
    clearTimeout(this.shareStatusTimer);
    this.shareStatus.set(status);
    if (status) {
      this.shareStatusTimer = setTimeout(() => this.shareStatus.set(null), SHARE_STATUS_MS);
    }
  }

  toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  onDelete(): void {
    if (!this.canDelete() || !this.isCurrentView(this.loadedId!, this.loadedKey!)) return;
    this.deleteError.set('');
    this.confirmOpen.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.confirmOpen.set(false);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    const animal = this.animal();
    const key = this.loadedKey;
    if (!animal || !this.canDelete() || this.deleting() || key === undefined || !this.isCurrentView(animal.id, key)) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.deleteRequest = this.animalService.delete(animal.id).subscribe({
      next: () => {
        if (!this.isCurrentView(animal.id, key)) return;
        this.translationCount.refresh();
        this.confirmOpen.set(false);
        this.router.navigate(['/']);
      },
      error: (error: unknown) => {
        if (!this.isCurrentView(animal.id, key)) return;
        this.deleteError.set(
          this.i18n.t(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'admin.accessDenied'
              : 'detail.delete.error',
          ),
        );
        this.deleting.set(false);
      },
    });
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
