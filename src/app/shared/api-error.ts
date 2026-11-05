import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  const body = error.error;
  if (typeof body === 'string' && body.trim()) return body.trim();
  const problems: unknown = body?.errors;
  if (problems && typeof problems === 'object') {
    const messages = Object.values(problems)
      .flat()
      .filter((message) => typeof message === 'string');
    if (messages.length > 0) return messages.join(' ');
  }
  return fallback;
}
