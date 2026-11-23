import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AnimalService } from './animal.service';
import { AnimalListState } from '../animals-list/animal-list-state';
import { LanguageService } from './i18n/language.service';

export function pickRandom(
  ids: readonly number[],
  random: () => number = Math.random,
): number | null {
  if (ids.length === 0) return null;
  return ids[Math.min(ids.length - 1, Math.floor(random() * ids.length))];
}

@Injectable({ providedIn: 'root' })
export class RandomAnimalService {
  private animalService = inject(AnimalService);
  private router = inject(Router);
  private state = inject(AnimalListState);
  private i18n = inject(LanguageService);

  open(): void {
    const id = pickRandom(this.state.randomPool());
    if (id !== null) {
      this.router.navigate(['/animals', id]);
      return;
    }
    this.animalService.getAll(this.i18n.language()).subscribe({
      next: (animals) => {
        const fallback = pickRandom(animals.map((animal) => animal.id));
        if (fallback !== null) this.router.navigate(['/animals', fallback]);
      },
      error: () => {},
    });
  }
}
