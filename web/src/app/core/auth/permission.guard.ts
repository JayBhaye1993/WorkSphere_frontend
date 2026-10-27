import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Route guard: needs the permission (any scope). The API still enforces it; this just avoids a dead screen. */
export const permissionGuard = (key: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  if (auth.can(key)) return true;
  // People screens fall back to the directory; settings fall back to More.
  return inject(Router).createUrlTree([key.startsWith('employees.') ? '/people' : '/more']);
};
