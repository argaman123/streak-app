import {
  Component, ElementRef, computed, effect, inject, signal, viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { SessionsService } from '../../services/sessions.service';
import { RestDaysService } from '../../services/rest-days.service';
import { T } from '../../services/strings';
import { parseIsoDate, todayIso, toIsoDate, formatDuration, roundMinutesUp5 } from '../../services/date.utils';

interface DayData {
  iso: string; weekday: string; minutes: number;
  isToday: boolean; isRest: boolean; emphasis: 'good' | 'zero';
}

/** One point on the line graph — only for non-rest learning days. */
interface LinePoint { x: number; y: number; d: DayData; }

// The frame is sized in CSS to match the week-view's 130px bars wrapper.
// A ResizeObserver feeds the actual pixel size into a signal so the SVG
// viewBox always equals the frame's real pixel dimensions — no
// preserveAspectRatio="none" squish, no letterboxing.
const PAD_X = 18;        // horizontal breathing room inside the frame
const PAD_TOP = 18;      // headroom for the "best" tag bleed
const PAD_BOTTOM = 26;   // clearance for the date labels overlaid at the bottom

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

  // Inner padding constants exposed for the template.
  protected readonly padX      = PAD_X;
  protected readonly padTop    = PAD_TOP;
  protected readonly padBottom = PAD_BOTTOM;

  // Live frame size in real pixels — fed by the ResizeObserver below.
  // Initial values are sensible defaults so SSR / first-paint don't divide
  // by zero before the observer fires.
  protected frameSize = signal({ w: 600, h: 130 });

  // Convenience derived values for the template.
  protected readonly frameW   = computed(() => this.frameSize().w);
  protected readonly frameH   = computed(() => this.frameSize().h);
  protected readonly baseY    = computed(() => this.frameSize().h - PAD_BOTTOM);
  protected readonly viewBoxAttr = computed(() => {
    const { w, h } = this.frameSize();
    return `0 0 ${w} ${h}`;
  });

  private frameEl = viewChild<ElementRef<HTMLElement>>('frame');

  constructor() {
    // Re-attach the observer whenever the frame element appears / disappears
    // (it lives inside an @if block that toggles with the range switch).
    effect((onCleanup) => {
      const el = this.frameEl()?.nativeElement;
      if (!el) return;
      const obs = new ResizeObserver(entries => {
        for (const e of entries) {
          const w = Math.max(120, Math.round(e.contentRect.width));
          const h = Math.max(80,  Math.round(e.contentRect.height));
          this.frameSize.set({ w, h });
        }
      });
      obs.observe(el);
      onCleanup(() => obs.disconnect());
    });
  }

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

    const out: DayData[] = [];
    const cursor = new Date(start);
    while (cursor <= todayDate) {
      const iso = toIsoDate(cursor);
      const minutes = totals.get(iso) ?? 0;
      out.push({
        iso, weekday: T.weekdayShort[cursor.getDay()],
        minutes, isToday: iso === today,
        isRest: this.restDays.isRest(iso),
        emphasis: minutes > 0 ? 'good' : 'zero'
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
  // non-rest-day sequence. All math is in real pixels (viewBox = frame
  // pixel size), so dots and stroke widths look identical at every screen
  // width without any aspect-ratio tricks.

  /** Only days with actual learning, for building the line graph. */
  private readonly learningDays = computed(() =>
    this.days().filter(d => d.minutes > 0)
  );

  protected readonly linePoints = computed<LinePoint[]>(() => {
    const data = this.learningDays();
    if (data.length === 0) return [];
    const { w, h } = this.frameSize();
    const max = this.maxMinutes();
    const baseY = h - PAD_BOTTOM;
    const innerH = h - PAD_TOP - PAD_BOTTOM;
    const innerW = w - PAD_X * 2;
    if (data.length === 1) {
      return [{
        x: w / 2,
        y: baseY - (data[0].minutes / max) * innerH,
        d: data[0]
      }];
    }
    return data.map((d, i) => ({
      x: PAD_X + (i / (data.length - 1)) * innerW,
      y: baseY - (d.minutes / max) * innerH,
      d
    }));
  });

  protected readonly linePath = computed(() => {
    const pts = this.linePoints().map(p => [p.x, p.y] as [number, number]);
    return smoothPath(pts);
  });

  protected readonly fillPath = computed(() => {
    const pts = this.linePoints().map(p => [p.x, p.y] as [number, number]);
    if (pts.length < 2) return '';
    const baseY = this.baseY();
    const line = smoothPath(pts);
    const lastX = pts[pts.length - 1][0];
    return `${line} L ${lastX} ${baseY} L ${PAD_X} ${baseY} Z`;
  });

  /** The day with the most learning — gets a coral chunky marker + "best" tag. */
  protected readonly peakPoint = computed<LinePoint | null>(() => {
    const pts = this.linePoints();
    if (pts.length === 0) return null;
    let best = pts[0];
    for (const p of pts) if (p.d.minutes > best.d.minutes) best = p;
    return best;
  });

  /** Today's point on the line — gets the halo marker + "today" tag. */
  protected readonly todayPoint = computed<LinePoint | null>(() =>
    this.linePoints().find(p => p.d.isToday) ?? null
  );

  /** Hide the peak tag when "best" and "today" are the same point. */
  protected readonly showPeakTag = computed(() => {
    const p = this.peakPoint();
    const t = this.todayPoint();
    return p !== null && p !== t;
  });

  // Dots for non-peak/non-today learning days. When there are lots of
  // points we sample so the chart doesn't get cluttered — the line itself
  // still traces every single day; we just skip drawing every dot.
  protected readonly minorDots = computed<LinePoint[]>(() => {
    const pts = this.linePoints();
    if (pts.length === 0) return [];
    const peak = this.peakPoint();
    const today = this.todayPoint();
    const maxDots = 24;
    const stride = Math.max(1, Math.ceil(pts.length / maxDots));
    const out: LinePoint[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (i % stride !== 0) continue;
      const p = pts[i];
      if (p === peak || p === today) continue;
      out.push(p);
    }
    return out;
  });

  /** Position helpers — turn pixel coords into container percentages. */
  protected leftPct(x: number): number { return (x / this.frameSize().w) * 100; }
  protected topPct(y: number): number  { return (y / this.frameSize().h) * 100; }

  /** Pick which side a trail tag sits on so it doesn't run off the card.
   *  - dot near left  → tag extends right (its left edge anchors to dot.x)
   *  - dot near right → tag extends left  (its right edge anchors to dot.x)
   *  - otherwise      → tag is centered above the dot.
   */
  protected tagSide(p: LinePoint | null): 'left' | 'center' | 'right' {
    if (!p) return 'center';
    const pct = (p.x / this.frameSize().w) * 100;
    if (pct < 25) return 'left';
    if (pct > 75) return 'right';
    return 'center';
  }

  protected readonly startLabel = computed(() => {
    const pts = this.linePoints();
    return pts.length > 0 ? this.shortDate(pts[0].d.iso) : '';
  });
  protected readonly endLabel = computed(() => {
    const pts = this.linePoints();
    return pts.length > 0 ? this.shortDate(pts[pts.length - 1].d.iso) : '';
  });
  private shortDate(iso: string): string {
    return parseIsoDate(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric'
    });
  }

  protected formatDur   = formatDuration;
  protected roundedMins = roundMinutesUp5;
}
