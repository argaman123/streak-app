import { Component, EventEmitter, Input, Output, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { T } from '../../services/strings';
import { todayIso, toIsoDate, parseIsoDate } from '../../services/date.utils';

interface CalDay {
  iso: string;
  num: number;
  inRange: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasMarker?: boolean;
  isRest?: boolean;
}

/**
 * Compact date picker. Defaults to a single-week view (the user said we don't
 * usually plan that far ahead). Tap "month" to expand. Tap "week" to collapse.
 *
 * Inputs:
 *   - selected:    'YYYY-MM-DD' currently selected day
 *   - markedDates: dots under days that have plans
 *   - restDates:   dots/styling for rest days
 */
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent {
  protected T = T;

  protected mode = signal<'week' | 'month'>('week');

  /** When in week mode: the date around which we center the visible week.
   *  When in month mode: any date in the visible month. */
  protected anchor = signal<string>(todayIso());

  @Input() set selected(v: string) {
    if (!v) return;
    this._selected.set(v);
    this.anchor.set(v);
  }
  protected _selected = signal<string>(todayIso());

  /** As input signals so the computed below reacts when the parent updates. */
  readonly markedDates = input<Set<string>>(new Set());
  readonly restDates   = input<Set<string>>(new Set());

  @Output() selectDate = new EventEmitter<string>();

  /** Days to render. 7 in week mode, 42 (6 rows) in month mode. */
  protected readonly days = computed<CalDay[]>(() => {
    return this.mode() === 'week' ? this.weekDays() : this.monthDays();
  });

  private weekDays(): CalDay[] {
    const a = parseIsoDate(this.anchor());
    const startOfWeek = new Date(a);
    startOfWeek.setDate(a.getDate() - a.getDay());

    const today = todayIso();
    const sel = this._selected();
    const marks = this.markedDates();
    const rests = this.restDates();

    const out: CalDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const iso = toIsoDate(d);
      out.push({
        iso, num: d.getDate(),
        inRange: true,
        isToday: iso === today,
        isSelected: iso === sel,
        hasMarker: marks.has(iso),
        isRest: rests.has(iso)
      });
    }
    return out;
  }

  private monthDays(): CalDay[] {
    const a = parseIsoDate(this.anchor());
    const y = a.getFullYear();
    const m = a.getMonth();
    const today = todayIso();
    const sel = this._selected();
    const marks = this.markedDates();
    const rests = this.restDates();

    const first = new Date(y, m, 1);
    const startWeekday = first.getDay();
    const gridStart = new Date(y, m, 1 - startWeekday);

    const out: CalDay[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toIsoDate(d);
      out.push({
        iso, num: d.getDate(),
        inRange: d.getMonth() === m,
        isToday: iso === today,
        isSelected: iso === sel,
        hasMarker: marks.has(iso),
        isRest: rests.has(iso)
      });
    }
    return out;
  }

  /** Title shown between the prev / next arrows. */
  protected readonly title = computed(() => {
    if (this.mode() === 'week') {
      const days = this.weekDays();
      const first = parseIsoDate(days[0].iso);
      const last = parseIsoDate(days[6].iso);
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      if (first.getMonth() === last.getMonth()) {
        return `${first.toLocaleDateString(undefined, { month: 'short' })} ${first.getDate()}–${last.getDate()}`;
      }
      return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, opts)}`;
    }
    const a = parseIsoDate(this.anchor());
    return a.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  protected prev(): void {
    const a = parseIsoDate(this.anchor());
    if (this.mode() === 'week') a.setDate(a.getDate() - 7);
    else a.setMonth(a.getMonth() - 1);
    this.anchor.set(toIsoDate(a));
  }

  protected next(): void {
    const a = parseIsoDate(this.anchor());
    if (this.mode() === 'week') a.setDate(a.getDate() + 7);
    else a.setMonth(a.getMonth() + 1);
    this.anchor.set(toIsoDate(a));
  }

  protected goToday(): void {
    const t = todayIso();
    this.anchor.set(t);
    this.pick(t);
  }

  protected toggleMode(): void {
    this.mode.set(this.mode() === 'week' ? 'month' : 'week');
  }

  protected pick(iso: string): void {
    this._selected.set(iso);
    this.anchor.set(iso);
    this.selectDate.emit(iso);
  }
}
