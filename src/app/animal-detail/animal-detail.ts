import { Component, EventEmitter, Output, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../animal.service';
import { AnimalImage } from '../animal-model/animal-image.model';

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule],
  templateUrl: './animal-detail.html',
  styleUrl: './animal-detail.css',
})
export class AnimalDetail implements OnInit {
  animal = input<Animal | null>(null);

  @Output() close = new EventEmitter<void>();

  private animalService = inject(AnimalService);

  images = signal<AnimalImage[]>([]);
  imagesLoading = signal(true);
  showDetails = signal(false);

  ngOnInit(): void {
    const current = this.animal();
    if (current) {
      this.loadImages(current.id);
    }
  }

  loadImages(animalId: number): void {
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
    this.close.emit();
  }
}
