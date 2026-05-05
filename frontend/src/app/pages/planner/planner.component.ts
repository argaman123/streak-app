import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PlansService } from '../../services/plans.service';
import { RestDaysService } from '../../services/rest-days.service';
import { T } from '../../services/strings';
import { todayIso, prettyDate } from '../../services/date.utils';

import { Plan } from '../../models/plan.model';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import { DragListDirective, DragItemDirective } from '../../components/dragdrop/dragdrop.directive';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent, DragListDirective, DragItemDirective],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss'
})
export class PlannerComponent {
  protected plans = inject(PlansService);
  protected restDays = inject(RestDaysService);
  protected T = T;

  protected today = todayIso();
  protected selectedDate = signal<string>(todayIso());
  protected newText = '';
  protected editingId = signal<string | null>(null);
  protected editingText = '';

  // Drag state: local reorder override (snappy drag without waiting for server)
  protected dragOrderOverride = signal<string[] | null>(null);

  /** Plans for selected day - reads directly from the store signal, always fresh */
  protected readonly plansForDay = computed(() =>
    this.plans.forDate(this.selectedDate())
  );

  /** Plans in display order: drag override if active, else canonical */
  protected readonly orderedPlans = computed<Plan[]>(() => {
    const override = this.dragOrderOverride();
    const canonical = this.plansForDay();
    if (!override) return canonical;
    const byId = new Map(canonical.map(p => [p.id, p]));
    return override.map(id => byId.get(id)).filter((p): p is Plan => !!p);
  });

  protected readonly orderedIds = computed(() => this.orderedPlans().map(p => p.id));

  protected readonly markedDates = computed(() => {
    const set = new Set<string>();
    for (const p of this.plans.plans()) set.add(p.date);
    return set;
  });

  protected readonly restDateSet = computed(() => new Set(this.restDays.days()));
  protected readonly prettySelected = computed(() => prettyDate(this.selectedDate()));
  protected readonly isSkipSelected = computed(() => this.restDays.isRest(this.selectedDate()));
  protected readonly isToday = computed(() => this.selectedDate() === this.today);

  protected onSelectDate(iso: string): void {
    this.selectedDate.set(iso);
    this.editingId.set(null);
    this.newText = '';
    this.dragOrderOverride.set(null);
  }

  protected async onAdd(): Promise<void> {
    const text = this.newText.trim();
    if (!text) return;
    this.plans.create({ date: this.selectedDate(), text });
    this.newText = '';
    this.dragOrderOverride.set(null);
  }

  protected startEdit(plan: Plan): void {
    this.editingId.set(plan.id);
    this.editingText = plan.text;
  }

  protected cancelEdit(): void { this.editingId.set(null); }

  protected async saveEdit(plan: Plan): Promise<void> {
    const text = this.editingText.trim();
    if (!text) return;
    this.plans.update(plan.id, { text });
    this.cancelEdit();
  }

  protected async onDelete(plan: Plan): Promise<void> {
    if (!confirm('Delete this plan?')) return;
    this.plans.delete(plan.id);
    this.dragOrderOverride.set(null);
  }

  /** Drag emits new id order - apply visually immediately, persist */
  protected async onReorder(newIds: string[]): Promise<void> {
    this.dragOrderOverride.set(newIds);
    this.plans.reorder(this.selectedDate(), newIds);
    // After persist, clear the override so it comes from the store
    this.dragOrderOverride.set(null);
  }

  protected async toggleSkipDay(): Promise<void> {
    this.restDays.toggle(this.selectedDate());
  }
}
