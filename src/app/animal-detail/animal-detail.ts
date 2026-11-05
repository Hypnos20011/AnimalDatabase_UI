import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { AnimalImage } from '../animal-model/animal-image.model';
import { RangePipe } from '../shared/range.pipe';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { sameName, wikimediaSrcset } from '../shared/wikimedia-image';
import { AdminKeyService } from '../admin/admin-key.service';
import { Language } from '../shared/i18n/languages';
import { LanguageService } from '../shared/i18n/language.service';
import { RecentlyViewedService } from '../animals-list/recently-viewed.service';
import { FavoritesService } from '../animals-list/favorites.service';
import { iucnRedListSearchUrl } from '../shared/iucn';
import { splitProfile } from '../shared/profile';
import { CompareService } from '../compare/compare.service';

export const SHARE_STATUS_MS = 3000;

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule, RouterLink, RangePipe, ConfirmDialog],
  templateUrl: './animal-detail.html',
  styleUrl: './animal-detail.css',
})
export class AnimalDetail {
  readonly years = computed(() => ({
    one: this.i18n.t('unit.year'),
    other: this.i18n.t('unit.years'),
  }));
  readonly srcset = wikimediaSrcset;

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
  protected admin = inject(AdminKeyService);
  protected i18n = inject(LanguageService);
  private recentlyViewed = inject(RecentlyViewedService);
  private favorites = inject(FavoritesService);
  protected compare = inject(CompareService);

  animal = signal<Animal | null>(null);
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
  iucnRedListUrl = computed(() => iucnRedListSearchUrl(this.animal()?.scientificName));
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
    inject(DestroyRef).onDestroy(() => clearTimeout(this.shareStatusTimer));
    effect(() => {
      const id = Number(this.id());
      const language = this.i18n.language();
      untracked(() => this.load(id, language));
    });
  }

  load(id: number, language: Language): void {
    const sameAnimal = this.animal()?.id === id;
    if (!sameAnimal) {
      this.loading.set(true);
      this.animal.set(null);
      this.showDetails.set(false);
      this.loadImages(id);
    }
    this.animalRequest?.unsubscribe();
    this.animalRequest = this.animalService.getById(id, language).subscribe({
      next: (data) => {
        this.animal.set(data);
        this.recentlyViewed.record(data.id, data.commonName);
        this.compare.rename(data.id, data.commonName);
        this.title.setTitle(`${data.commonName} · Unusual Animals`);
        this.loading.set(false);
      },
      error: () => {
        this.animal.set(null);
        this.loading.set(false);
      },
    });
  }

  loadImages(animalId: number): void {
    this.imagesLoading.set(true);
    this.heroFailed.set(false);
    this.imagesRequest?.unsubscribe();
    this.imagesRequest = this.animalService.getImages(animalId).subscribe({
      next: (data) => {
        this.images.set(data);
        this.imagesLoading.set(false);
      },
      error: () => {
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
    if (!this.animal()) return;
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
    if (!animal || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.animalService.delete(animal.id).subscribe({
      next: () => {
        this.confirmOpen.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        this.deleteError.set(this.i18n.t('detail.delete.error'));
        this.deleting.set(false);
      },
    });
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
