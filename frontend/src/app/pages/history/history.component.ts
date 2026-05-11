import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SessionsService } from '../../services/sessions.service';
import { RestDaysService } from '../../services/rest-days.service';
import { T } from '../../services/strings';
import { formatDuration, prettyDate, sessionHeadline } from '../../services/date.utils';

import { ModalComponent } from '../../components/modal/modal.component';
import { SessionFormComponent } from '../../components/session-form/session-form.component';
import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';
import { Session } from '../../models/session.model';

interface DayGroup {
  date: string; pretty: string; totalMinutes: number; items: Session[]; isSkip: boolean;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ModalComponent, SessionFormComponent, ProgressChartComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent {
  protected sessions = inject(SessionsService);
  protected restDays = inject(RestDaysService);
  protected T = T;
  protected editing = signal<Session | null>(null);
  protected showAdd = signal(false);
  protected addDate = signal<string | undefined>(undefined);

  protected readonly grouped = computed<DayGroup[]>(() => {
    const map = new Map<string, Session[]>();
    for (const s of this.sessions.sessions()) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date, pretty: prettyDate(date),
      totalMinutes: items.reduce((n, s) => n + s.durationMinutes, 0),
      items: items.sort((a, b) => {
        const ta = a.startTime ? this.timeToMin(a.startTime) : 9999;
        const tb = b.startTime ? this.timeToMin(b.startTime) : 9999;
        return ta - tb;
      }),
      isSkip: this.restDays.isRest(date)
    })).sort((a, b) => (a.date < b.date ? 1 : -1));
  });

  protected openEdit(s: Session): void { this.editing.set(s); }
  protected closeEdit(): void { this.editing.set(null); }
  protected async onEditSave(input: Omit<Session, 'id'>): Promise<void> {
    const cur = this.editing(); if (!cur) return;
    this.sessions.update(cur.id, input); this.closeEdit();
  }
  protected async onDelete(): Promise<void> {
    const cur = this.editing(); if (!cur) return;
    if (!confirm(T.delete + '?')) return;
    this.sessions.delete(cur.id); this.closeEdit();
  }
  protected openAdd(): void {
    this.addDate.set(undefined);
    this.showAdd.set(true);
  }
  protected addToDay(date: string): void {
    this.addDate.set(date);
    this.showAdd.set(true);
  }
  protected closeAdd(): void { this.showAdd.set(false); }
  protected async onAddSave(input: Omit<Session, 'id'>): Promise<void> {
    this.sessions.create(input); this.closeAdd();
  }

  protected formatDur = formatDuration;
  protected sessionHeadlineFor = (s: Session) => sessionHeadline(s.durationMinutes);
  protected sessionTimeLabel(s: Session): string {
    if (s.startTime && s.endTime) return `${s.startTime} – ${s.endTime}`;
    return formatDuration(s.durationMinutes);
  }
  private timeToMin(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number); return h * 60 + m;
  }
}
