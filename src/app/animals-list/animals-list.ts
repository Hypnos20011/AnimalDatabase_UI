import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AnimalService } from '../animal.service';
import { Animal } from '../animal-model/animal.model';
import { AnimalListState } from './animal-list-state';
import { SearchService } from '../search.service';
import { TopSearch } from '../animal-model/top-search.model';

@Component({
  selector: 'app-animals-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './animals-list.html',
  styleUrl: './animals-list.css',
  host: {
    '(document:keydown.escape)': 'filtersOpen.set(false)',
  },
})
export class AnimalsList {
  private animalService = inject(AnimalService);
  private router = inject(Router);
  private state = inject(AnimalListState);
  private searchService = inject(SearchService);

  animals = signal<Animal[]>([]);
  loading = signal(true);
  error = signal('');

  query = this.state.query;
  selectedClasses = this.state.selectedClasses;
  selectedStatuses = this.state.selectedStatuses;
  filterType = this.state.filterType;
  lengthFrom = this.state.lengthFrom;
  lengthTo = this.state.lengthTo;
  weightFrom = this.state.weightFrom;
  weightTo = this.state.weightTo;
  filtersOpen = signal(false);
  topSearches = signal<TopSearch[]>([]);

  activeFilterCount = computed(
    () =>
      this.selectedClasses().size +
      this.selectedStatuses().size +
      (this.filterType() === 'wild' ? 1 : 0) +
      (this.lengthFrom() !== null || this.lengthTo() !== null ? 1 : 0) +
      (this.weightFrom() !== null || this.weightTo() !== null ? 1 : 0),
  );

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
    const lengthFrom = this.lengthFrom();
    const lengthTo = this.lengthTo();
    const weightFrom = this.weightFrom();
    const weightTo = this.weightTo();

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

      if (!this.inRange(animal.sizeLengthCmMin, animal.sizeLengthCmMax, lengthFrom, lengthTo)) {
        return false;
      }

      if (!this.inRange(animal.weightKgMin, animal.weightKgMax, weightFrom, weightTo)) {
        return false;
      }

      return !(type === 'wild' && animal.isDomesticated);
    });
  });

  constructor() {
    this.searchService.getTop().subscribe({
      next: (data) => this.topSearches.set(data),
      error: () => this.topSearches.set([]),
    });
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

  toNumber(value: string): number | null {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  clearAll(): void {
    this.selectedClasses.set(new Set());
    this.selectedStatuses.set(new Set());
    this.filterType.set('all');
    this.lengthFrom.set(null);
    this.lengthTo.set(null);
    this.weightFrom.set(null);
    this.weightTo.set(null);
  }

  private inRange(
    min: number | null,
    max: number | null,
    from: number | null,
    to: number | null,
  ): boolean {
    if (from === null && to === null) return true;
    const low = min ?? max;
    const high = max ?? min;
    if (low === null || high === null) return false;
    if (from !== null && high < from) return false;
    if (to !== null && low > to) return false;
    return true;
  }

  getThumbnail(animal: Animal): string | null {
    return animal.thumbnailUrl;
  }

  selectAnimal(animal: Animal): void {
    this.searchService.record(this.query(), animal.id).subscribe({ error: () => {} });
    this.router.navigate(['/animals', animal.id]);
  }

  openRandomAnimal(): void {
    const pool = this.filteredAnimals().length > 0 ? this.filteredAnimals() : this.animals();
    if (pool.length === 0) return;
    const animal = pool[Math.floor(Math.random() * pool.length)];
    this.router.navigate(['/animals', animal.id]);
  }

  openTopSearch(top: TopSearch): void {
    this.router.navigate(['/animals', top.animalId]);
  }
}
