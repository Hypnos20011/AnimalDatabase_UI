import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminKeyService } from './admin-key.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  if (inject(AdminKeyService).unlocked()) return true;
  return inject(Router).createUrlTree(['/admin'], { queryParams: { returnUrl: state.url } });
};
