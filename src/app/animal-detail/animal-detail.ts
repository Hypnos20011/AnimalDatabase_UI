import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../animal.service';
import { AnimalImage } from '../animal-model/animal-image.model';

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './animal-detail.html',
  styleUrl: './animal-detail.css',
})
export class AnimalDetail {
  id = input.required<string>();

  private animalService = inject(AnimalService);
  private router = inject(Router);

  animal = signal<Animal | null>(null);
  loading = signal(true);
  images = signal<AnimalImage[]>([]);
  imagesLoading = signal(true);
  showDetails = signal(false);
  deleting = signal(false);
  deleteError = signal('');

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
    const animal = this.animal();
    if (!animal) return;
    if (!confirm(`Delete ${animal.commonName}? This can't be undone.`)) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.animalService.delete(animal.id).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.deleteError.set('Could not delete this animal.');
        this.deleting.set(false);
      },
    });
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
