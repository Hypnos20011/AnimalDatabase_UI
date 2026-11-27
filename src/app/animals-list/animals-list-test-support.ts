import { signal } from '@angular/core';
import { AdminKeyService } from '../admin/admin-key.service';

export function provideLockedAdmin() {
  return { provide: AdminKeyService, useValue: { key: signal<string | null>(null).asReadonly(), unlocked: signal(false) } };
}