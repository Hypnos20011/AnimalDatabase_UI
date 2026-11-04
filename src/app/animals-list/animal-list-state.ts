import { Injectable, signal } from '@angular/core';
import { DEFAULT_TOP_SEARCH_DAYS, TopSearchDays } from './top-search-window';

export type FilterType = 'all' | 'wild';

export type SortOption =
  | 'relevance'
  | 'name-asc'
  | 'name-desc'
  | 'length-desc'
  | 'length-asc'
  | 'weight-desc'
  | 'weight-asc'
  | 'newest';

@Injectable({ providedIn: 'root' })
export class AnimalListState {
  query = signal('');
  selectedClasses = signal<Set<string>>(new Set());
  selectedStatuses = signal<Set<string>>(new Set());
  selectedHabitats = signal<Set<string>>(new Set());
  filterType = signal<FilterType>('all');
  lengthFrom = signal<number | null>(null);
  lengthTo = signal<number | null>(null);
  weightFrom = signal<number | null>(null);
  weightTo = signal<number | null>(null);
  sortBy = signal<SortOption>('relevance');
  topSearchDays = signal<TopSearchDays>(DEFAULT_TOP_SEARCH_DAYS);
  randomPool = signal<number[]>([]);
  scrollY = signal<number>(0);
}
