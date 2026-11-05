import { computed, Injectable, signal } from '@angular/core';

export const COMPARE_STORAGE = 'animaldb.compare';
export const COMPARE_MAX = 2;

export interface CompareItem {
  id: number;
  commonName: string;
}

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly items = signal<CompareItem[]>(readStored());
  readonly selection = this.items.asReadonly();
  readonly ids = computed(() => this.items().map((item) => item.id));
  readonly count = computed(() => this.items().length);
  readonly ready = computed(() => this.items().length === COMPARE_MAX);

  has(id: number): boolean {
    return this.ids().includes(id);
  }

  add(id: number, commonName: string): void {
    if (this.has(id)) {
      this.update(this.items().map((item) => (item.id === id ? { id, commonName } : item)));
      return;
    }
    this.update([...this.items(), { id, commonName }].slice(-COMPARE_MAX));
  }

  remove(id: number): void {
    if (!this.has(id)) {
      return;
    }
    this.update(this.items().filter((item) => item.id !== id));
  }

  toggle(id: number, commonName: string): boolean {
    if (this.has(id)) {
      this.remove(id);
      return false;
    }
    this.add(id, commonName);
    return true;
  }

  swap(): void {
    if (this.items().length < 2) {
      return;
    }
    this.update([...this.items()].reverse());
  }

  clear(): void {
    if (this.items().length > 0) {
      this.update([]);
    }
  }

  set(items: CompareItem[]): void {
    this.update(sanitize(items));
  }

  rename(id: number, commonName: string): void {
    const current = this.items().find((item) => item.id === id);
    if (current && current.commonName !== commonName) {
      this.update(this.items().map((item) => (item.id === id ? { id, commonName } : item)));
    }
  }

  private update(next: CompareItem[]): void {
    this.items.set(next);
    persist(next);
  }
}

function persist(items: CompareItem[]): void {
  try {
    localStorage.setItem(COMPARE_STORAGE, JSON.stringify(items));
  } catch {}
}

function sanitize(items: unknown[]): CompareItem[] {
  const seen = new Set<number>();
  return items
    .filter(
      (item): item is CompareItem =>
        !!item &&
        typeof item === 'object' &&
        Number.isInteger((item as CompareItem).id) &&
        typeof (item as CompareItem).commonName === 'string',
    )
    .map((item) => ({ id: item.id, commonName: item.commonName }))
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    })
    .slice(-COMPARE_MAX);
}

function readStored(): CompareItem[] {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitize(parsed) : [];
  } catch {
    return [];
  }
}
