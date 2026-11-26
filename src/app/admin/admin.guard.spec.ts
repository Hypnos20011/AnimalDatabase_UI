import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { adminGuard, adminOnlyGuard, adminPageGuard } from './admin.guard';
import { ADMIN_KEY_STORAGE, AdminKeyService } from './admin-key.service';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';

describe('adminGuard', () => {
  let http: HttpTestingController;

  function run(url: string) {
    return TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  function runAdminOnly(url: string) {
    return TestBed.runInInjectionContext(() =>
      adminOnlyGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  function runAdminPage(url: string) {
    return TestBed.runInInjectionContext(() =>
      adminPageGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('sends locked visitors to /admin and remembers where they wanted to go', async () => {
    const result = await firstValueFrom(run('/animals/3/edit') as Observable<boolean | UrlTree>);
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/admin?returnUrl=%2Fanimals%2F3%2Fedit',
    );
  });

  it.each(['admin', 'tester'] as const)('lets a %s through to edit routes', async (role) => {
    TestBed.inject(AdminKeyService).set('secret', role);
    expect(await firstValueFrom(run('/animals/new') as Observable<boolean | UrlTree>)).toBe(true);
  });

  it('allows admins on the translations route', async () => {
    TestBed.inject(AdminKeyService).set('secret', 'admin');
    expect(await firstValueFrom(runAdminOnly('/admin/missing') as Observable<boolean | UrlTree>)).toBe(true);
  });

  it('allows locked visitors and admins to access the admin key page', async () => {
    expect(await firstValueFrom(runAdminPage('/admin') as Observable<boolean | UrlTree>)).toBe(true);

    TestBed.inject(AdminKeyService).set('secret', 'admin');
    expect(await firstValueFrom(runAdminPage('/admin') as Observable<boolean | UrlTree>)).toBe(true);
  });

  it('redirects testers visiting the admin page to the list', async () => {
    TestBed.inject(AdminKeyService).set('secret', 'tester');
    const result = await firstValueFrom(runAdminPage('/admin') as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('waits for a stored role before redirecting a tester from the admin page', async () => {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, 'stored-key');
    const resultPromise = firstValueFrom(runAdminPage('/admin') as Observable<boolean | UrlTree>);
    await Promise.resolve();
    http.expectOne((request) => request.url.endsWith('/admin/check')).flush({ role: 'tester' });

    const result = await resultPromise;
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('redirects testers from the translations route to the list', async () => {
    TestBed.inject(AdminKeyService).set('secret', 'tester');
    const result = await firstValueFrom(runAdminOnly('/admin/missing') as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('sends locked visitors from the translations route to the key form', async () => {
    const result = await firstValueFrom(runAdminOnly('/admin/missing') as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/admin?returnUrl=%2Fadmin%2Fmissing',
    );
  });
});
