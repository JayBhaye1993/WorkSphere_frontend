import { HttpErrorResponse } from '@angular/common/http';

/** The API's own message when it sent one, otherwise a plain sentence. */
export function errorText(e: unknown, fallback: string): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach WorkSphere. Check your connection and try again.';
    const msg = e.error?.error;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}
