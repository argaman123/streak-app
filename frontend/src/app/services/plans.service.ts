import { Injectable, inject } from '@angular/core';
import { Plan } from '../models/plan.model';
import { StoreService } from './store.service';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

@Injectable({ providedIn: 'root' })
export class PlansService {
  private store = inject(StoreService);
  readonly plans = this.store.plans;

  create(input: Omit<Plan, 'id'>): Plan {
    const sameDayCount = this.store.plans().filter(p => p.date === input.date).length;
    const p: Plan = { ...input, id: newId(), orderIndex: sameDayCount };
    this.store.setPlans([p, ...this.store.plans()]);
    return p;
  }

  update(id: string, changes: Partial<Plan>): void {
    this.store.setPlans(
      this.store.plans().map(p => p.id === id ? { ...p, ...changes } : p)
    );
  }

  delete(id: string): void {
    this.store.setPlans(this.store.plans().filter(p => p.id !== id));
  }

  /** Reorder plans for a specific day. ids must be in the desired order. */
  reorder(date: string, ids: string[]): void {
    this.store.setPlans(
      this.store.plans().map(p =>
        p.date === date && ids.includes(p.id)
          ? { ...p, orderIndex: ids.indexOf(p.id) }
          : p
      )
    );
  }

  /**
   * Toggle the checked state of a plan for today.
   * The check is stored as checkedDate = today's ISO string.
   * Checking tomorrow automatically unsets it (different date).
   */
  toggleCheck(id: string, today: string): void {
    this.store.setPlans(
      this.store.plans().map(p =>
        p.id === id
          ? { ...p, checkedDate: p.checkedDate === today ? undefined : today }
          : p
      )
    );
  }

  isChecked(id: string, today: string): boolean {
    const p = this.store.plans().find(q => q.id === id);
    return p?.checkedDate === today;
  }

  forDate(date: string): Plan[] {
    return this.plans()
      .filter(p => p.date === date)
      .sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
  }
}
