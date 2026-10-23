import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { adminGuard } from './admin.guard';
import { AdminKeyService } from './admin-key.service';

describe('adminGuard', () => {
  function run(url: string) {
    return TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  afterEach(() => sessionStorage.clear());

  it('sends locked visitors to /admin and remembers where they wanted to go', () => {
    const result = run('/animals/3/edit');
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/admin?returnUrl=%2Fanimals%2F3%2Fedit',
    );
  });

  it('lets an unlocked admin through', () => {
    TestBed.inject(AdminKeyService).set('secret');
    expect(run('/animals/new')).toBe(true);
  });
});
