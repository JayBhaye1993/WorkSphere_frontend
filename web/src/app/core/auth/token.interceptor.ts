import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Adds the access token. On a 401 it refreshes once and retries.
 * - Requests that fail together share ONE refresh: refresh tokens rotate, so a second refresh with the
 *   same token would be refused and sign the person out.
 * - Only a refused refresh (401/400, or no refresh token) signs out. A network error keeps the session.
 */
let refreshing$: Observable<unknown> | null = null;

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const withToken = (r: typeof req) => {
    const t = auth.getAccessToken();
    return t ? r.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : r;
  };

  return next(withToken(req)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/')) return throwError(() => err);
      refreshing$ ??= auth.refreshToken().pipe(
        finalize(() => { refreshing$ = null; }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      return refreshing$.pipe(
        // Only refresh failures land here; errors from the retried request pass through untouched.
        catchError(refreshErr => {
          const refused = !(refreshErr instanceof HttpErrorResponse) || refreshErr.status === 401 || refreshErr.status === 400;
          if (refused) auth.logout();
          return throwError(() => err);
        }),
        switchMap(() => next(withToken(req))),
      );
    }),
  );
};
