import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, ReplaySubject, catchError, map, of, take, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const ADMIN_KEY_HEADER = 'X-Admin-Key';
export const ADMIN_KEY_STORAGE = 'animal-database.admin-key';
export type AdminRole = 'admin' | 'tester';
export type AdminRoleState = AdminRole | 'none';

@Injectable({ providedIn: 'root' })
export class AdminKeyService {
  private http = inject(HttpClient);
  private readonly stored = signal<string | null>(readStoredKey());
  private readonly initialCheck = new ReplaySubject<void>(1);
  private initialCheckResolved = false;

  readonly key = this.stored.asReadonly();
  readonly role = signal<AdminRoleState>('none');
  readonly unlocked = computed(() => this.role() !== 'none');
  readonly checkUrl = `${environment.apiUrl}/admin/check`;

  constructor() {
    const key = this.stored();
    if (!key) {
      this.resolveInitialCheck();
      return;
    }
    Promise.resolve().then(() => this.restore(key));
  }

  set(key: string, role: AdminRole): void {
    this.stored.set(key);
    this.role.set(role);
    try {
      sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
    } catch {}
    this.resolveInitialCheck();
  }

  clear(): void {
    this.stored.set(null);
    this.role.set('none');
    try {
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    } catch {}
    this.resolveInitialCheck();
  }

  waitForInitialCheck(): Observable<void> {
    return this.initialCheck.asObservable().pipe(take(1));
  }

  verify(key: string): Observable<AdminRole | null> {
    return this.http
      .get<{ role?: unknown }>(this.checkUrl, { headers: { [ADMIN_KEY_HEADER]: key } })
      .pipe(
        map((response) => {
          const role = response?.role;
          if (role !== 'admin' && role !== 'tester') throw new Error('Unexpected role response.');
          return role;
        }),
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 401
            ? of(null)
            : throwError(() => error),
        ),
      );
  }

  private restore(key: string): void {
    this.verify(key).subscribe({
      next: (role) => {
        if (this.stored() === key) {
          if (role) this.role.set(role);
          else this.clear();
        }
        this.resolveInitialCheck();
      },
      error: () => {
        if (this.stored() === key) this.role.set('none');
        this.resolveInitialCheck();
      },
    });
  }

  private resolveInitialCheck(): void {
    if (this.initialCheckResolved) return;
    this.initialCheckResolved = true;
    this.initialCheck.next();
    this.initialCheck.complete();
  }
}

function readStoredKey(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || null;
  } catch {
    return null;
  }
}
