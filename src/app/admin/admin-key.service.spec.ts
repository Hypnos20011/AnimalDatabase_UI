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

  it('revalidates a key already stored in this tab before unlocking', async () => {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, 'stored-key');
    const admin = create();
    expect(admin.unlocked()).toBe(false);
    expect(admin.key()).toBe('stored-key');

    await Promise.resolve();
    const request = http.expectOne(`${environment.apiUrl}/admin/check`);
    expect(request.request.headers.get('X-Admin-Key')).toBe('stored-key');
    request.flush({ role: 'tester' });

    expect(admin.role()).toBe('tester');
    expect(admin.unlocked()).toBe(true);
  });

  it('keeps the key in sessionStorage and clears it on lock', () => {
    const admin = create();
    admin.set('secret', 'admin');
    expect(sessionStorage.getItem(ADMIN_KEY_STORAGE)).toBe('secret');
    expect(admin.unlocked()).toBe(true);
    expect(admin.role()).toBe('admin');

    admin.clear();
    expect(sessionStorage.getItem(ADMIN_KEY_STORAGE)).toBeNull();
    expect(admin.unlocked()).toBe(false);
    expect(admin.role()).toBe('none');
  });

  it.each(['admin', 'tester'] as const)('reads the %s role from /admin/check', (role) => {
    const admin = create();
    let result: string | null | undefined;
    admin.verify('good').subscribe((valid) => (result = valid));

    const request = http.expectOne(`${environment.apiUrl}/admin/check`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('X-Admin-Key')).toBe('good');
    request.flush({ role });

    expect(result).toBe(role);
    expect(admin.unlocked()).toBe(false);
  });

  it('reports a wrong key as none on 401', () => {
    const admin = create();
    let result: string | null | undefined;
    admin.verify('bad').subscribe((valid) => (result = valid));

    http
      .expectOne(`${environment.apiUrl}/admin/check`)
      .flush('A valid admin key is required.', { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeNull();
  });

  it('rejects an unexpected role response', () => {
    const admin = create();
    let failed = false;
    admin.verify('unexpected').subscribe({ error: () => (failed = true) });

    http.expectOne(`${environment.apiUrl}/admin/check`).flush({ role: 'owner' });

    expect(failed).toBe(true);
    expect(admin.unlocked()).toBe(false);
  });

  it('clears a stored key when startup verification returns 401', async () => {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, 'stale-key');
    const admin = create();

    await Promise.resolve();
    http
      .expectOne(`${environment.apiUrl}/admin/check`)
      .flush('wrong key', { status: 401, statusText: 'Unauthorized' });

    expect(admin.key()).toBeNull();
    expect(admin.role()).toBe('none');
    expect(sessionStorage.getItem(ADMIN_KEY_STORAGE)).toBeNull();
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
