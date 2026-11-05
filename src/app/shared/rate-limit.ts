import { HttpErrorResponse } from '@angular/common/http';
import { formatCount } from './plural';

export function isRateLimited(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === 429;
}

/** Seconds to wait from a short Retry-After header, or null when it should read "in a minute". */
export function retryAfterSeconds(error: HttpErrorResponse): number | null {
  const seconds = Number(error.headers?.get('Retry-After'));
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 45) return null;
  return Math.ceil(seconds);
}

export function tryAgainIn(error: HttpErrorResponse): string {
  const seconds = retryAfterSeconds(error);
  if (seconds === null) return 'in a minute';
  return `in ${formatCount(seconds, { one: 'second', other: 'seconds' })}`;
}

export function rateLimitMessage(error: HttpErrorResponse, what: string): string {
  return `Too many ${what}. Try again ${tryAgainIn(error)}.`;
}
