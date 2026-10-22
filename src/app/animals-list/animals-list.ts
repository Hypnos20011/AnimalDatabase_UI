import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnimalDetail } from '../animal-detail/animal-detail';
import { AnimalService } from '../animal.service';
import { Animal } from '../animal-model/animal.model';

type FilterType = 'all' | 'wild';

@Component({
  selector: 'app-animals-list',
  imports: [CommonModule, AnimalDetail, RouterLink],
  templateUrl: './animals-list.html',
  styleUrl: './animals-list.css',
})
export class AnimalsList {
  private animalService = inject(AnimalService);

  animals = signal<Animal[]>([]);
  loading = signal(true);
  error = signal('');

  query = signal('');
  selectedClasses = signal<Set<string>>(new Set());
  selectedStatuses = signal<Set<string>>(new Set());
  filterType = signal<FilterType>('all');

  selectedAnimal = signal<Animal | null>(null);

  suggestions = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];

    return this.animals()
      .filter((animal) => {
        const name = animal.commonName.toLowerCase();
        const sci = (animal.scientificName ?? '').toLowerCase();
        return name.includes(q) || sci.includes(q);
      })
      .slice(0, 8);
  });

  availableClasses = computed(() => {
    const set = new Set<string>();
    for (const a of this.animals()) {
      if (a.taxonomicClass) set.add(a.taxonomicClass);
    }
    return Array.from(set).sort();
  });

  availableStatuses = computed(() => {
    const set = new Set<string>();
    for (const a of this.animals()) {
      if (a.iucnStatus) set.add(a.iucnStatus);
    }
    return Array.from(set).sort();
  });

  showDomesticated = computed(() => this.filterType() === 'all');

  filteredAnimals = computed(() => {
    const q = this.query().trim().toLowerCase();
    const classes = this.selectedClasses();
    const statuses = this.selectedStatuses();
    const type = this.filterType();

    return this.animals().filter((animal) => {
      if (q) {
        const haystack = [animal.commonName, animal.scientificName ?? '', animal.profile ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (classes.size > 0 && animal.taxonomicClass && !classes.has(animal.taxonomicClass)) {
        return false;
      }

      if (statuses.size > 0 && animal.iucnStatus && !statuses.has(animal.iucnStatus)) {
        return false;
      }

      return !(type === 'wild' && animal.isDomesticated);
    });
  });

  constructor() {
    this.animalService.getAll().subscribe({
      next: (data) => {
        this.animals.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Could not load animals');
        this.loading.set(false);
      },
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
  }

  isClassActive(cls: string): boolean {
    return this.selectedClasses().has(cls);
  }

  toggleClass(cls: string): void {
    const next = new Set(this.selectedClasses());
    if (next.has(cls)) next.delete(cls);
    else next.add(cls);
    this.selectedClasses.set(next);
  }

  isStatusActive(status: string): boolean {
    return this.selectedStatuses().has(status);
  }

  toggleStatus(status: string): void {
    const next = new Set(this.selectedStatuses());
    if (next.has(status)) next.delete(status);
    else next.add(status);
    this.selectedStatuses.set(next);
  }

  toggleType(): void {
    this.filterType.update((current) => (current === 'all' ? 'wild' : 'all'));
  }

  getThumbnail(animal: Animal): string | null {
    return animal.thumbnailUrl;
  }

  selectAnimal(animal: Animal): void {
    this.selectedAnimal.set(animal);
  }

  closeDetail(): void {
    this.selectedAnimal.set(null);
  }
}
