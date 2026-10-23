import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { adminKeyInterceptor } from './admin-key.interceptor';
import { ADMIN_KEY_STORAGE, AdminKeyService } from './admin-key.service';
import { environment } from '../../environments/environment';

describe('adminKeyInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let admin: AdminKeyService;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([adminKeyInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    admin = TestBed.inject(AdminKeyService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('adds the header to API requests when unlocked', () => {
    admin.set('secret');
    client.delete(`${environment.apiUrl}/animals/2`).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/animals/2`);
    expect(request.request.headers.get('X-Admin-Key')).toBe('secret');
    request.flush(null);
  });

  it('sends no header while locked', () => {
    client.get(`${environment.apiUrl}/animals`).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/animals`);
    expect(request.request.headers.has('X-Admin-Key')).toBe(false);
    request.flush([]);
  });

  it('never sends the key to other hosts', () => {
    admin.set('secret');
    client.get('https://en.wikipedia.org/api/rest_v1/page/summary/Okapi').subscribe();
    const request = http.expectOne((req) => req.url.startsWith('https://en.wikipedia.org'));
    expect(request.request.headers.has('X-Admin-Key')).toBe(false);
    request.flush({});
  });

  it('clears the key and goes to the unlock page when a write returns 401', () => {
    admin.set('stale');
    let failed = false;
    client.put(`${environment.apiUrl}/animals/2`, {}).subscribe({ error: () => (failed = true) });

    http
      .expectOne(`${environment.apiUrl}/animals/2`)
      .flush('A valid admin key is required.', { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(admin.unlocked()).toBe(false);
    expect(sessionStorage.getItem(ADMIN_KEY_STORAGE)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/admin'], { queryParams: {} });
  });

  it('leaves the key alone on other errors', () => {
    admin.set('secret');
    client.delete(`${environment.apiUrl}/animals/2`).subscribe({ error: () => undefined });
    http
      .expectOne(`${environment.apiUrl}/animals/2`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(admin.unlocked()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect when the key check itself says 401', () => {
    admin.verify('wrong').subscribe();
    http
      .expectOne(`${environment.apiUrl}/admin/check`)
      .flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();
  });
});
