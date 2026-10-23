import { HttpErrorResponse } from '@angular/common/http';
import { formatCount } from './plural';

export function isRateLimited(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === 429;
}

export function tryAgainIn(error: HttpErrorResponse): string {
  const seconds = Number(error.headers?.get('Retry-After'));
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 45) return 'in a minute';
  return `in ${formatCount(Math.ceil(seconds), { one: 'second', other: 'seconds' })}`;
}

export function rateLimitMessage(error: HttpErrorResponse, what: string): string {
  return `Too many ${what}. Try again ${tryAgainIn(error)}.`;
}
