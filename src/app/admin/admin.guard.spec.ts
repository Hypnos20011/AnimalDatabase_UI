import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { adminGuard, adminOnlyGuard } from './admin.guard';
import { AdminKeyService } from './admin-key.service';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';

describe('adminGuard', () => {
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

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  afterEach(() => sessionStorage.clear());

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

  it('sends testers from the translations route to the status page', async () => {
    TestBed.inject(AdminKeyService).set('secret', 'tester');
    const result = await firstValueFrom(runAdminOnly('/admin/missing') as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/admin');
  });

  it('sends locked visitors from the translations route to the key form', async () => {
    const result = await firstValueFrom(runAdminOnly('/admin/missing') as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/admin?returnUrl=%2Fadmin%2Fmissing',
    );
  });
});
