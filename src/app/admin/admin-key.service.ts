import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const ADMIN_KEY_HEADER = 'X-Admin-Key';
export const ADMIN_KEY_STORAGE = 'animal-database.admin-key';

@Injectable({ providedIn: 'root' })
export class AdminKeyService {
  private http = inject(HttpClient);
  private readonly stored = signal<string | null>(readStoredKey());

  readonly key = this.stored.asReadonly();
  readonly unlocked = computed(() => !!this.stored());
  readonly checkUrl = `${environment.apiUrl}/admin/check`;

  set(key: string): void {
    this.stored.set(key);
    try {
      sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
    } catch {}
  }

  clear(): void {
    this.stored.set(null);
    try {
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    } catch {}
  }

  verify(key: string): Observable<boolean> {
    return this.http
      .get(this.checkUrl, { headers: { [ADMIN_KEY_HEADER]: key }, observe: 'response' })
      .pipe(
        map(() => true),
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 401
            ? of(false)
            : throwError(() => error),
        ),
      );
  }
}

function readStoredKey(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || null;
  } catch {
    return null;
  }
}
