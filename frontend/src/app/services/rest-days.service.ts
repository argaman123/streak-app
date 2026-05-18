import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class RestDaysService {
  private store = inject(StoreService);
  readonly days = this.store.restDays;

  isRest(date: string): boolean {
    return this.days().includes(date);
  }

  toggle(date: string): void {
    if (this.days().includes(date)) {
      this.store.removeRestDay(date);
    } else {
      this.store.addRestDay(date);
    }
  }
}
