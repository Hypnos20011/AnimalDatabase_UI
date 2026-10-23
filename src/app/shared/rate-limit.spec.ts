import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { isRateLimited, rateLimitMessage, tryAgainIn } from './rate-limit';

function tooMany(retryAfter?: string): HttpErrorResponse {
  const headers = retryAfter ? new HttpHeaders({ 'Retry-After': retryAfter }) : new HttpHeaders();
  return new HttpErrorResponse({ status: 429, headers, error: 'Too many requests.' });
}

describe('rate limit messages', () => {
  it('only treats 429 responses as rate limited', () => {
    expect(isRateLimited(tooMany())).toBe(true);
    expect(isRateLimited(new HttpErrorResponse({ status: 400 }))).toBe(false);
    expect(isRateLimited(new Error('down'))).toBe(false);
  });

  it('says a minute when the server gives no wait or a long one', () => {
    expect(tryAgainIn(tooMany())).toBe('in a minute');
    expect(tryAgainIn(tooMany('60'))).toBe('in a minute');
    expect(tryAgainIn(tooMany('soon'))).toBe('in a minute');
  });

  it('uses the server wait when it is short', () => {
    expect(tryAgainIn(tooMany('12'))).toBe('in 12 seconds');
    expect(tryAgainIn(tooMany('1'))).toBe('in 1 second');
  });

  it('builds a short sentence', () => {
    expect(rateLimitMessage(tooMany(), 'lookups')).toBe('Too many lookups. Try again in a minute.');
  });
});
