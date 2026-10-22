import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../animal.service';
import { AnimalImage } from '../animal-model/animal-image.model';

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule],
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

  onClose(): void {
    this.router.navigate(['/']);
  }
}
