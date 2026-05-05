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
    const current = this.days();
    if (current.includes(date)) {
      this.store.setRestDays(current.filter(d => d !== date));
    } else {
      this.store.setRestDays([...current, date]);
    }
  }
}
