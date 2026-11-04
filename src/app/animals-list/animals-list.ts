import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AnimalListState, SortOption } from './animal-list-state';
import { SearchService } from './search.service';
import { TopSearch } from '../animal-model/top-search.model';
import { matchAnimal, matchHint, matchRank, normalizeText, SearchMatch } from './animal-search';
import { Subscription } from 'rxjs';
import { wikimediaSrcset } from '../shared/wikimedia-image';
import { parseTopSearchDays, TOP_SEARCH_WINDOWS } from './top-search-window';
import { indexLabel, pickActive } from './active-animal';
import { iucnCode, iucnLabel, iucnRank } from '../shared/iucn';
import { LanguageService } from '../shared/i18n/language.service';
import { TranslationKey } from '../shared/i18n/en';

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
  protected i18n = inject(LanguageService);

  animals = signal<Animal[]>([]);
  loading = signal(true);
  error = signal('');

  query = this.state.query;
  selectedClasses = this.state.selectedClasses;
  selectedStatuses = this.state.selectedStatuses;
  selectedHabitats = this.state.selectedHabitats;
  filterType = this.state.filterType;
  lengthFrom = this.state.lengthFrom;
  lengthTo = this.state.lengthTo;
  weightFrom = this.state.weightFrom;
  weightTo = this.state.weightTo;
  sortBy = this.state.sortBy;
  filtersOpen = signal(false);

  readonly sortOptions: { value: SortOption; labelKey: TranslationKey }[] = [
    { value: 'relevance', labelKey: 'list.sort.relevance' },
    { value: 'name-asc', labelKey: 'list.sort.nameAsc' },
    { value: 'name-desc', labelKey: 'list.sort.nameDesc' },
    { value: 'length-desc', labelKey: 'list.sort.lengthDesc' },
    { value: 'length-asc', labelKey: 'list.sort.lengthAsc' },
    { value: 'weight-desc', labelKey: 'list.sort.weightDesc' },
    { value: 'weight-asc', labelKey: 'list.sort.weightAsc' },
    { value: 'newest', labelKey: 'list.sort.newest' },
  ];
  topSearches = signal<TopSearch[]>([]);
  topSearchDays = this.state.topSearchDays;
  topLoaded = signal(false);
  topError = signal(false);
  readonly topSearchWindows = TOP_SEARCH_WINDOWS;
  showAnimalsLabel = computed(() =>
    this.i18n.tPlural('list.showAnimals', this.filteredAnimals().length),
  );
  topEmptyText = computed(() =>
    this.topError()
      ? this.i18n.t('list.top.unavailable')
      : this.topSearchDays() <= 0
        ? this.i18n.t('list.top.empty.all')
        : this.i18n.tPlural('list.top.empty.days', this.topSearchDays()),
  );
  private topRequest?: Subscription;

  activeFilterCount = computed(
    () =>
      this.selectedClasses().size +
      this.selectedStatuses().size +
      (this.filterType() === 'wild' ? 1 : 0) +
      (this.lengthFrom() !== null || this.lengthTo() !== null ? 1 : 0) +
      (this.weightFrom() !== null || this.weightTo() !== null ? 1 : 0) +
      this.selectedHabitats().size,
  );

  searchMatches = computed(() => {
    const matches = new Map<number, SearchMatch>();
    const query = this.query();
    if (!normalizeText(query)) return matches;
    for (const animal of this.animals()) {
      const match = matchAnimal(animal, query);
      if (match) matches.set(animal.id, match);
    }
    return matches;
  });

  suggestions = computed(() => {
    if (normalizeText(this.query()).length < 2) return [];
    const matches = this.searchMatches();

    return this.animals()
      .filter((animal) => matches.get(animal.id)?.name)
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
    return Array.from(set).sort((a, b) => iucnRank(a) - iucnRank(b));
  });

  availableHabitats = computed(() => {
    const set = new Set<string>();
    for (const a of this.animals()) {
      if (a.habitatType) set.add(a.habitatType);
    }
    return Array.from(set).sort();
  });

  filteredAnimals = computed(() => {
    const hasQuery = normalizeText(this.query()).length > 0;
    const matches = this.searchMatches();
    const classes = this.selectedClasses();
    const statuses = this.selectedStatuses();
    const habitats = this.selectedHabitats();
    const type = this.filterType();
    const lengthFrom = this.lengthFrom();
    const lengthTo = this.lengthTo();
    const weightFrom = this.weightFrom();
    const weightTo = this.weightTo();

    return this.animals().filter((animal) => {
      if (hasQuery && !matches.has(animal.id)) return false;

      if (classes.size > 0 && (!animal.taxonomicClass || !classes.has(animal.taxonomicClass))) {
        return false;
      }

      if (habitats.size > 0 && (!animal.habitatType || !habitats.has(animal.habitatType))) {
        return false;
      }

      if (statuses.size > 0 && (!animal.iucnStatus || !statuses.has(animal.iucnStatus))) {
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

  sortedAnimals = computed(() => {
    const sort = this.sortBy();
    const list = [...this.filteredAnimals()];
    const byName = (a: Animal, b: Animal) => a.commonName.localeCompare(b.commonName);
    const matches = this.searchMatches();
    const byRelevance = (a: Animal, b: Animal) =>
      matchRank(matches.get(a.id)) - matchRank(matches.get(b.id)) || byName(a, b);
    const byNumber = (
      value: (a: Animal) => number | null,
      descending: boolean,
    ): ((a: Animal, b: Animal) => number) => {
      return (a, b) => {
        const x = value(a);
        const y = value(b);
        if (x === null && y === null) return byName(a, b);
        if (x === null) return 1;
        if (y === null) return -1;
        return (descending ? y - x : x - y) || byName(a, b);
      };
    };
    const length = (a: Animal) => a.sizeLengthCmMax ?? a.sizeLengthCmMin;
    const weight = (a: Animal) => a.weightKgMax ?? a.weightKgMin;

    switch (sort) {
      case 'relevance':
        return list.sort(byRelevance);
      case 'name-desc':
        return list.sort((a, b) => byName(b, a));
      case 'length-desc':
        return list.sort(byNumber(length, true));
      case 'length-asc':
        return list.sort(byNumber(length, false));
      case 'weight-desc':
        return list.sort(byNumber(weight, true));
      case 'weight-asc':
        return list.sort(byNumber(weight, false));
      case 'newest':
        return list.sort((a, b) => b.id - a.id);
      default:
        return list.sort(byName);
    }
  });

  activeId = signal<number | null>(null);
  active = computed(() => pickActive(this.sortedAnimals(), this.activeId()));
  countDigits = computed(() => String(this.filteredAnimals().length).padStart(2, '0'));
  countText = computed(() => this.i18n.tPlural('list.count', this.filteredAnimals().length));
  readonly indexLabel = indexLabel;
  readonly iucnCode = iucnCode;
  readonly iucnLabel = iucnLabel;

  constructor() {
    effect(() => {
      const visible = this.filteredAnimals();
      const pool = visible.length > 0 ? visible : this.animals();
      this.state.randomPool.set(pool.map((animal) => animal.id));
    });
    this.loadTopSearches();
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

  onTopSearchDaysChange(value: string): void {
    this.topSearchDays.set(parseTopSearchDays(value));
    this.loadTopSearches();
  }

  private loadTopSearches(): void {
    this.topRequest?.unsubscribe();
    this.topRequest = this.searchService.getTop(5, this.topSearchDays()).subscribe({
      next: (data) => {
        this.topSearches.set(data);
        this.topError.set(false);
        this.topLoaded.set(true);
      },
      error: () => {
        this.topSearches.set([]);
        this.topError.set(true);
        this.topLoaded.set(true);
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

  isHabitatsActive(habitat: string): boolean {
    return this.selectedHabitats().has(habitat);
  }

  statusCount(status: string): number {
    return this.animals().filter((animal) => animal.iucnStatus === status).length;
  }

  habitatsCount(habitat: string): number {
    return this.animals().filter((animal) => animal.habitatType === habitat).length;
  }

  toggleStatus(status: string): void {
    const next = new Set(this.selectedStatuses());
    if (next.has(status)) next.delete(status);
    else next.add(status);
    this.selectedStatuses.set(next);
  }

  toggleHabitats(habitat: string): void {
    const next = new Set(this.selectedHabitats());
    if (next.has(habitat)) next.delete(habitat);
    else next.add(habitat);
    this.selectedHabitats.set(next);
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
    this.selectedHabitats.set(new Set());
    this.filterType.set('all');
    this.lengthFrom.set(null);
    this.lengthTo.set(null);
    this.weightFrom.set(null);
    this.weightTo.set(null);
  }

  onSortChange(value: string): void {
    this.sortBy.set(value as SortOption);
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
    return !(to !== null && low > to);
  }

  matchHint(animal: Animal): string {
    const key = matchHint(this.searchMatches().get(animal.id));
    return key ? this.i18n.t(key) : '';
  }

  readonly srcset = wikimediaSrcset;

  getThumbnail(animal: Animal): string | null {
    return animal.thumbnailUrl;
  }

  setActive(id: number): void {
    this.activeId.set(id);
  }

  previewExtra(animal: Animal): string {
    return [
      animal.family,
      animal.habitatType ? this.i18n.tValue('habitat', animal.habitatType) : null,
    ]
      .filter((part) => !!part?.trim())
      .join(' / ');
  }

  recordOpen(animal: Animal): void {
    this.searchService.record(this.query(), animal.id).subscribe({ error: () => {} });
  }

  selectAnimal(animal: Animal): void {
    this.recordOpen(animal);
    this.router.navigate(['/animals', animal.id]);
  }
}
