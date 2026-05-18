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
    this.store.upsertPlan(p);
    return p;
  }

  update(id: string, changes: Partial<Plan>): void {
    const p = this.store.plans().find(p => p.id === id);
    if (p) this.store.upsertPlan({ ...p, ...changes });
  }

  delete(id: string): void {
    this.store.deletePlan(id);
  }

  reorder(date: string, ids: string[]): void {
    for (const p of this.store.plans()) {
      if (p.date === date && ids.includes(p.id))
        this.store.upsertPlan({ ...p, orderIndex: ids.indexOf(p.id) });
    }
  }

  toggleCheck(id: string, today: string): void {
    const p = this.store.plans().find(p => p.id === id);
    if (p) this.store.upsertPlan({ ...p, checkedDate: p.checkedDate === today ? undefined : today });
  }

  isChecked(id: string, today: string): boolean {
    return this.store.plans().find(p => p.id === id)?.checkedDate === today;
  }

  forDate(date: string): Plan[] {
    return this.plans()
      .filter(p => p.date === date)
      .sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
  }
}
