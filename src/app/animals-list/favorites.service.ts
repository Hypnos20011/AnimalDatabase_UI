import { computed, Injectable, signal } from '@angular/core';

export const FAVORITES_STORAGE = 'animaldb.favorites';

export interface FavoriteItem {
  id: number;
  commonName: string;
  starredAt: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly items = signal<FavoriteItem[]>(readStored());
  readonly favorites = this.items.asReadonly();
  readonly ids = computed(() => new Set(this.items().map((item) => item.id)));

  isFavorite(id: number): boolean {
    return this.ids().has(id);
  }

  add(id: number, commonName: string): void {
    if (this.isFavorite(id)) {
      this.update(
        this.items().map((item) => (item.id === id ? { ...item, commonName } : item)),
      );
      return;
    }
    this.update([{ id, commonName, starredAt: new Date().toISOString() }, ...this.items()]);
  }

  remove(id: number): void {
    if (!this.isFavorite(id)) {
      return;
    }
    this.update(this.items().filter((item) => item.id !== id));
  }

  toggle(id: number, commonName: string): boolean {
    if (this.isFavorite(id)) {
      this.remove(id);
      return false;
    }
    this.add(id, commonName);
    return true;
  }

  pruneMissing(existingIds: Iterable<number>): void {
    const existing = new Set(existingIds);
    const next = this.items().filter((item) => existing.has(item.id));
    if (next.length !== this.items().length) {
      this.update(next);
    }
  }

  private update(next: FavoriteItem[]): void {
    this.items.set(next);
    persist(next);
  }
}

function persist(items: FavoriteItem[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(items));
  } catch {}
}

function readStored(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const seen = new Set<number>();
    return parsed
      .filter(
        (item): item is FavoriteItem =>
          !!item &&
          typeof item === 'object' &&
          typeof item.id === 'number' &&
          typeof item.commonName === 'string' &&
          typeof item.starredAt === 'string',
      )
      .map((item) => ({ id: item.id, commonName: item.commonName, starredAt: item.starredAt }))
      .sort((a, b) => starredTime(b) - starredTime(a))
      .filter((item) => {
        if (seen.has(item.id)) {
          return false;
        }
        seen.add(item.id);
        return true;
      });
  } catch {
    return [];
  }
}

function starredTime(item: FavoriteItem): number {
  const time = Date.parse(item.starredAt);
  return Number.isNaN(time) ? 0 : time;
}
