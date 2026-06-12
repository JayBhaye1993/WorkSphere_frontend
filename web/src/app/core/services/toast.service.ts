import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; message: string; type: 'success' | 'info' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts  = this._toasts.asReadonly();
  private next = 0;

  show(message: string, type: Toast['type'] = 'success'): void {
    const id = ++this.next;
    this._toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), 2200);
  }

  remove(id: number): void {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}
