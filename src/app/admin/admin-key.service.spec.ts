import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ADMIN_KEY_STORAGE, AdminKeyService } from './admin-key.service';
import { environment } from '../../environments/environment';

describe('AdminKeyService', () => {
  let http: HttpTestingController;

  function create() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AdminKeyService);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    http?.verify();
    sessionStorage.clear();
  });

  it('starts locked without a stored key', () => {
    const admin = create();
    expect(admin.unlocked()).toBe(false);
    expect(admin.key()).toBeNull();
  });

  it('picks up a key already stored in this tab', () => {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, 'stored-key');
    const admin = create();
    expect(admin.unlocked()).toBe(true);
    expect(admin.key()).toBe('stored-key');
  });

  it('keeps the key in sessionStorage and clears it on lock', () => {
    const admin = create();
    admin.set('secret');
    expect(sessionStorage.getItem(ADMIN_KEY_STORAGE)).toBe('secret');
    expect(admin.unlocked()).toBe(true);

    admin.clear();
    expect(sessionStorage.getItem(ADMIN_KEY_STORAGE)).toBeNull();
    expect(admin.unlocked()).toBe(false);
  });

  it('verifies a key against /admin/check and accepts 204', () => {
    const admin = create();
    let result: boolean | undefined;
    admin.verify('good').subscribe((valid) => (result = valid));

    const request = http.expectOne(`${environment.apiUrl}/admin/check`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('X-Admin-Key')).toBe('good');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(result).toBe(true);
    expect(admin.unlocked()).toBe(false);
  });

  it('reports a wrong key as false on 401', () => {
    const admin = create();
    let result: boolean | undefined;
    admin.verify('bad').subscribe((valid) => (result = valid));

    http
      .expectOne(`${environment.apiUrl}/admin/check`)
      .flush('A valid admin key is required.', { status: 401, statusText: 'Unauthorized' });

    expect(result).toBe(false);
  });

  it('passes other failures on as errors', () => {
    const admin = create();
    let failed = false;
    admin.verify('any').subscribe({ error: () => (failed = true) });

    http
      .expectOne(`${environment.apiUrl}/admin/check`)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });

    expect(failed).toBe(true);
  });
});
