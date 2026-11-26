import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminKeyService } from './admin-key.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const admin = inject(AdminKeyService);
  const router = inject(Router);
  return admin.waitForInitialCheck().pipe(
    map(() =>
      admin.unlocked()
        ? true
        : router.createUrlTree(['/admin'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};

export const adminOnlyGuard: CanActivateFn = (_route, state) => {
  const admin = inject(AdminKeyService);
  const router = inject(Router);
  return admin.waitForInitialCheck().pipe(
    map(() => {
      if (admin.role() === 'admin') return true;
      if (admin.role() === 'tester') return router.createUrlTree(['/admin']);
      return router.createUrlTree(['/admin'], { queryParams: { returnUrl: state.url } });
    }),
  );
};
