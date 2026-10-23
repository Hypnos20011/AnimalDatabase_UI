import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ADMIN_KEY_HEADER, AdminKeyService } from './admin-key.service';

export const adminKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url === environment.apiUrl || req.url.startsWith(`${environment.apiUrl}/`);
  if (!isApi) return next(req);

  const admin = inject(AdminKeyService);
  const router = inject(Router);
  const key = admin.key();
  const isCheck = req.url === admin.checkUrl;
  const request =
    key && !req.headers.has(ADMIN_KEY_HEADER)
      ? req.clone({ setHeaders: { [ADMIN_KEY_HEADER]: key } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isCheck) {
        admin.clear();
        const returnUrl = router.url;
        router.navigate(['/admin'], {
          queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {},
        });
      }
      return throwError(() => error);
    }),
  );
};
