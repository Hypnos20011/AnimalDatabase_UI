import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../animal.service';
import { AnimalImage } from '../animal-model/animal-image.model';
import { RangePipe } from '../shared/range.pipe';
import { YEARS } from '../shared/format-range';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { sameName, wikimediaSrcset } from '../shared/wikimedia-image';

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule, RouterLink, RangePipe, ConfirmDialog],
  templateUrl: './animal-detail.html',
  styleUrl: './animal-detail.css',
})
export class AnimalDetail {
  readonly years = YEARS;
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

  animal = signal<Animal | null>(null);
  loading = signal(true);
  images = signal<AnimalImage[]>([]);
  heroImage = computed(() => this.images()[0] ?? null);
  moreImages = computed(() => this.images().slice(1));

  private profileParts = computed(() => {
    const profile = this.animal()?.profile ?? '';
    const match = profile.match(/\s*Fun fact:\s*/i);
    if (!match || match.index === undefined) return { text: profile.trim(), funFact: '' };
    return {
      text: profile.slice(0, match.index).trim(),
      funFact: profile.slice(match.index + match[0].length).trim(),
    };
  });
  profileText = computed(() => this.profileParts().text);
  funFact = computed(() => this.profileParts().funFact);
  imagesLoading = signal(true);
  showDetails = signal(false);
  confirmOpen = signal(false);
  deleting = signal(false);
  deleteError = signal('');
  deleteTitle = computed(() => `Delete ${this.animal()?.commonName ?? 'this animal'}?`);
  readonly deleteMessage =
    "This removes the animal and its pictures for good, and it drops out of Top searches. This can't be undone.";

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.load(id));
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.animal.set(null);
    this.showDetails.set(false);
    this.animalService.getById(id).subscribe({
      next: (data) => {
        this.animal.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.animal.set(null);
        this.loading.set(false);
      },
    });
    this.loadImages(id);
  }

  loadImages(animalId: number): void {
    this.imagesLoading.set(true);
    this.animalService.getImages(animalId).subscribe({
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
        this.deleteError.set('Could not delete this animal. Please try again.');
        this.deleting.set(false);
      },
    });
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
