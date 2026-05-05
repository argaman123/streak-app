import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SessionsService } from '../../services/sessions.service';
import { RestDaysService } from '../../services/rest-days.service';
import { T } from '../../services/strings';
import { parseIsoDate, todayIso, toIsoDate, formatDuration, roundMinutesUp5 } from '../../services/date.utils';

interface DayData {
  iso: string; weekday: string; minutes: number;
  isToday: boolean; isRest: boolean; emphasis: 'good' | 'low' | 'zero';
}

/** One point on the line graph — only for non-rest learning days. */
interface LinePoint { x: number; y: number; d: DayData; }

const W = 600, H = 120, PAD = 10;

/** Build a smooth cubic-bezier path through a list of [x,y] points. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const cpx = px + (cx - px) * 0.4;
    const cp2x = cx - (cx - px) * 0.4;
    d += ` C ${cpx} ${py} ${cp2x} ${cy} ${cx} ${cy}`;
  }
  return d;
}

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-chart.component.html',
  styleUrl: './progress-chart.component.scss'
})
export class ProgressChartComponent {
  protected sessions = inject(SessionsService);
  protected restDays = inject(RestDaysService);
  protected T = T;
  protected range = signal<'week' | 'all'>('week');

  protected readonly days = computed<DayData[]>(() => {
    const totals = new Map<string, number>();
    for (const s of this.sessions.sessions()) {
      totals.set(s.date, (totals.get(s.date) ?? 0) + s.durationMinutes);
    }
    const today = todayIso();
    const todayDate = parseIsoDate(today);

    let start: Date;
    if (this.range() === 'week') {
      start = new Date(todayDate);
      start.setDate(start.getDate() - 6);
    } else {
      const keys = [...totals.keys()].sort();
      if (keys.length > 0) {
        start = parseIsoDate(keys[0]);
      } else {
        start = new Date(todayDate);
        start.setDate(start.getDate() - 13);
      }
    }

    // Threshold for "good day": needs to be relative to actual learning days only
    const nonzero = [...totals.values()].filter(v => v > 0).sort((a, b) => a - b);
    const median = nonzero.length ? nonzero[Math.floor(nonzero.length / 2)] : 30;
    const goodThreshold = Math.max(30, median * 0.7);

    const out: DayData[] = [];
    const cursor = new Date(start);
    while (cursor <= todayDate) {
      const iso = toIsoDate(cursor);
      const minutes = totals.get(iso) ?? 0;
      out.push({
        iso, weekday: T.weekdayShort[cursor.getDay()],
        minutes, isToday: iso === today,
        isRest: this.restDays.isRest(iso),
        emphasis: minutes === 0 ? 'zero' : minutes >= goodThreshold ? 'good' : 'low'
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  });

  /** Scale by the largest day in the range (rest day learning included). */
  protected readonly maxMinutes = computed(() => {
    const max = this.days().reduce((m, b) => Math.max(m, b.minutes), 0);
    return max > 0 ? max : 1;
  });

  /**
   * Total INCLUDES learning done on rest days. If she ended up studying
   * even on a "no-learning" day, those minutes count toward her weekly total.
   * (The chart just hides rest-day bars visually so they don't skew the shape.)
   */
  protected readonly totalMinutes = computed(() =>
    this.days().reduce((sum, b) => sum + b.minutes, 0)
  );

  protected setRange(r: 'week' | 'all'): void { this.range.set(r); }

  /**
   * Bar height in % of the track.
   *  - Rest day with NO learning  -> 0 (no bar at all)
   *  - Rest day WITH learning     -> normal height (the .is-rest class on the
   *                                  column dims the whole bar so it reads as
   *                                  a "still happened, but it was a rest day"
   *                                  signal without skewing the chart shape)
   *  - Regular day, 0 minutes     -> 3px stub
   *  - Regular day, >0 minutes    -> scaled to the day with the most learning
   */
  protected barHeight(d: DayData): number {
    if (d.isRest && d.minutes === 0) return 0;
    if (d.minutes === 0) return 3;
    return Math.max(8, (d.minutes / this.maxMinutes()) * 100);
  }

  // ── Line graph (all-time view) ─────────────────────────────────────
  // Rest days are SKIPPED entirely. The line connects only learning days,
  // spaced evenly across the SVG width based on their position in the
  // non-rest-day sequence.

  /** Only the non-rest days, for building the line graph. */
  private readonly learningDays = computed(() =>
    this.days().filter(d => !d.isRest)
  );

  private toLinePoints(): LinePoint[] {
    const data = this.learningDays();
    if (data.length < 2) return [];
    const max = this.maxMinutes();
    return data.map((d, i) => ({
      x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
      y: H - PAD - (d.minutes / max) * (H - PAD * 2),
      d
    }));
  }

  protected readonly linePoints = computed<LinePoint[]>(() => this.toLinePoints());

  protected readonly linePath = computed(() => {
    const pts = this.toLinePoints().map(p => [p.x, p.y] as [number, number]);
    return smoothPath(pts);
  });

  protected readonly fillPath = computed(() => {
    const pts = this.toLinePoints().map(p => [p.x, p.y] as [number, number]);
    if (pts.length < 2) return '';
    const line = smoothPath(pts);
    const lastX = pts[pts.length - 1][0];
    return `${line} L ${lastX} ${H} L ${PAD} ${H} Z`;
  });

  protected formatDur   = formatDuration;
  protected roundedMins = roundMinutesUp5;
}
