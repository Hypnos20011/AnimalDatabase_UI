import { Injectable, signal } from '@angular/core';

export const RECENTLY_VIEWED_STORAGE = 'animaldb.recentlyViewed';
export const RECENTLY_VIEWED_LIMIT = 8;

export interface RecentlyViewedItem {
  id: number;
  commonName: string;
}

@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly items = signal<RecentlyViewedItem[]>(readStored());
  readonly recent = this.items.asReadonly();

  record(id: number, commonName: string): void {
    const next = [
      { id, commonName },
      ...this.items().filter((item) => item.id !== id),
    ].slice(0, RECENTLY_VIEWED_LIMIT);
    this.items.set(next);
    persist(next);
  }
}

function persist(items: RecentlyViewedItem[]): void {
  try {
    localStorage.setItem(RECENTLY_VIEWED_STORAGE, JSON.stringify(items));
  } catch {}
}

function readStored(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (item): item is RecentlyViewedItem =>
          !!item &&
          typeof item === 'object' &&
          typeof item.id === 'number' &&
          typeof item.commonName === 'string',
      )
      .slice(0, RECENTLY_VIEWED_LIMIT);
  } catch {
    return [];
  }
}
