import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AnimalListState, SortOption } from './animal-list-state';
import { SearchService } from './search.service';
import { TopSearch } from '../animal-model/top-search.model';
import { matchAnimal, matchHint, matchRank, normalizeText, SearchMatch } from './animal-search';
import { filter, Subscription } from 'rxjs';
import { wikimediaSrcset } from '../shared/wikimedia-image';
import { parseTopSearchDays, TOP_SEARCH_WINDOWS } from './top-search-window';
import { indexLabel, pickActive } from './active-animal';
import { iucnCode, iucnLabel, iucnRank } from '../shared/iucn';
import { LanguageService } from '../shared/i18n/language.service';
import { TranslationKey } from '../shared/i18n/en';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Language } from '../shared/i18n/languages';
import { RecentlyViewedService } from './recently-viewed.service';
import { FavoritesService } from './favorites.service';
import { CompareService } from '../compare/compare.service';
import { RandomAnimalService } from '../shared/random-animal.service';
import { AdminKeyService } from '../admin/admin-key.service';
import { animalStatusLabel, isPublicAnimal } from '../shared/animal-status';

@Component({
  selector: 'app-animals-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './animals-list.html',
  styleUrl: './animals-list.css',
  host: {
    '(document:keydown.escape)': 'filtersOpen.set(false)',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AnimalsList {
  private animalService = inject(AnimalService);
  private router = inject(Router);
  private state = inject(AnimalListState);
  private searchService = inject(SearchService);
  protected i18n = inject(LanguageService);
  private recentlyViewed = inject(RecentlyViewedService);
  private favoritesService = inject(FavoritesService);
  protected compare = inject(CompareService);
  private random = inject(RandomAnimalService);
  protected admin = inject(AdminKeyService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private loadedAnimals = signal<Animal[]>([]);
  private loadedKey = signal<string | null>(null);
  animals = computed(() => {
    const animals = this.loadedAnimals();
    const key = this.admin.key();
    return key && key === this.loadedKey() ? animals : animals.filter(isPublicAnimal);
  });
  loading = signal(true);
  error = signal(false);

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
  favoritesOnly = this.state.favoritesOnly;
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
  recentItems = computed(() => {
    const byId = new Map(this.animals().map((animal) => [animal.id, animal]));
    return this.recentlyViewed.recent()
      .filter((item) => byId.has(item.id))
      .map((item) => ({ id: item.id, commonName: byId.get(item.id)!.commonName }));
  });
  favoriteIds = this.favoritesService.ids;
  favoriteItems = computed(() => {
    const byId = new Map(this.animals().map((animal) => [animal.id, animal]));
    return this.favoritesService
      .favorites()
      .filter((item) => byId.has(item.id))
      .map((item) => ({ id: item.id, commonName: byId.get(item.id)!.commonName }));
  });
  compareItems = computed(() => {
    const byId = new Map(this.animals().map((animal) => [animal.id, animal]));
    return this.compare.selection()
      .filter((item) => byId.has(item.id))
      .map((item) => ({ id: item.id, commonName: byId.get(item.id)!.commonName }));
  });
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
  private animalsRequest?: Subscription;
  private restoredScroll = false;

  activeFilterCount = computed(
    () =>
      this.selectedClasses().size +
      this.selectedStatuses().size +
      (this.filterType() === 'wild' ? 1 : 0) +
      (this.lengthFrom() !== null || this.lengthTo() !== null ? 1 : 0) +
      (this.weightFrom() !== null || this.weightTo() !== null ? 1 : 0) +
      this.selectedHabitats().size +
      (this.favoritesOnly() ? 1 : 0),
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
    const favoriteIds = this.favoritesOnly() ? this.favoriteIds() : null;

    return this.animals().filter((animal) => {
      if (hasQuery && !matches.has(animal.id)) return false;

      if (favoriteIds && !favoriteIds.has(animal.id)) return false;

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
  readonly animalStatusLabel = animalStatusLabel;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.state.scrollY.set(window.scrollY);
      });
    effect(() => {
      const visible = this.filteredAnimals().filter(isPublicAnimal);
      const pool = visible.length > 0 ? visible : this.animals().filter(isPublicAnimal);
      this.state.randomPool.set(pool.map((animal) => animal.id));
    });
    this.loadTopSearches();
    effect(() => {
      const language = this.i18n.language();
      const key = this.admin.key();
      untracked(() => {
        if (key === null) this.loadedAnimals.update((animals) => animals.filter(isPublicAnimal));
        this.loadAnimals(language, key);
      });
    });
  }

  private loadAnimals(language: Language, key: string | null): void {
    this.animalsRequest?.unsubscribe();
    this.error.set(false);
    this.loading.set(true);
    this.animalsRequest = this.animalService.getAll(language).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (this.admin.key() !== key || this.i18n.language() !== language) return;
        this.loadedKey.set(key);
        this.loadedAnimals.set(data);
        this.loading.set(false);
        if (!this.restoredScroll) {
          this.restoredScroll = true;
          afterNextRender(() => window.scrollTo(0, this.state.scrollY()), {
            injector: this.injector,
          });
        }
      },
      error: () => {
        if (this.admin.key() !== key || this.i18n.language() !== language) return;
        this.error.set(true);
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

  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (this.filtersOpen()) return;
    if (this.isTypingTarget(event.target)) return;

    if (event.key === '/') {
      event.preventDefault();
      const input = this.searchInput()?.nativeElement;
      if (!input) return;
      input.focus();
      input.select();
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      this.random.open();
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return target.closest('[contenteditable="true"], [contenteditable=""]') !== null;
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

  toggleFavoritesOnly(): void {
    this.favoritesOnly.update((value) => !value);
  }

  isFavorite(id: number): boolean {
    return this.favoriteIds().has(id);
  }

  toggleFavorite(animal: Animal): void {
    this.favoritesService.toggle(animal.id, animal.commonName);
  }

  favoriteLabel(animal: Animal): string {
    return this.i18n.t(this.isFavorite(animal.id) ? 'favorites.remove' : 'favorites.add', {
      name: animal.commonName,
    });
  }

  isCompared(id: number): boolean {
    return this.compare.has(id);
  }

  toggleCompare(animal: Animal): void {
    this.compare.toggle(animal.id, animal.commonName);
  }

  compareLabel(animal: Animal): string {
    return this.i18n.t(this.isCompared(animal.id) ? 'compare.remove' : 'compare.add', {
      name: animal.commonName,
    });
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
    this.favoritesOnly.set(false);
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
