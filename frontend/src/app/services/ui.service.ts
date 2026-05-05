import { Injectable, signal } from '@angular/core';

/**
 * Tiny UI state that the app shell needs to react to but isn't model data.
 * Right now: whether a modal is open (so the bottom nav can slide out of the way).
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly modalOpen = signal(false);
}
