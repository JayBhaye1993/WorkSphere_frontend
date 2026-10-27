import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard: needs one of the permissions (any scope). The API still enforces every rule;
 * this only keeps people off screens they cannot use.
 */
export const permissionGuard = (keys: string | string[]): CanActivateFn => () => {
  const list = Array.isArray(keys) ? keys : [keys];
  const auth = inject(AuthService);
  if (list.some(k => auth.can(k))) return true;
  // People screens fall back to the directory; settings fall back to More.
  return inject(Router).createUrlTree([list[0].startsWith('employees.') ? '/people' : '/more']);
};
