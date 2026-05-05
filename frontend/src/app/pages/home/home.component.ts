import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { SessionsService } from '../../services/sessions.service';
import { PlansService } from '../../services/plans.service';
import { TimerService } from '../../services/timer.service';
import { RestDaysService } from '../../services/rest-days.service';
import { T } from '../../services/strings';
import {
  todayIso, prettyDate, formatDuration, formatElapsed,
  calculateStreak, toIsoTime, toIsoDate,
  sessionHeadline, sessionDurationSecondary
} from '../../services/date.utils';

import { ModalComponent } from '../../components/modal/modal.component';
import { SessionFormComponent } from '../../components/session-form/session-form.component';
import { MascotComponent } from '../../components/mascot/mascot.component';
import { Session } from '../../models/session.model';

import { EngineComponent } from '../../components/engine/engine.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ModalComponent, SessionFormComponent, MascotComponent, EngineComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  protected sessions = inject(SessionsService);
  protected plans = inject(PlansService);
  protected timer = inject(TimerService);
  protected restDays = inject(RestDaysService);
  protected T = T;

  protected readonly today = computed(() => { this.timer.now(); return todayIso(); });
  protected readonly prettyToday = computed(() => prettyDate(this.today()));

  // Modal state
  protected showAddModal = signal(false);
  protected editingSession = signal<Session | null>(null);
  protected skipRestOverride = signal(false);

  // Plan checkoff — stored on the plan itself (checkedDate field), syncs with backend.
  // Toggling calls the plans service which marks plans dirty and triggers a save.
  protected togglePlanCheck(id: string): void {
    this.plans.toggleCheck(id, this.today());
  }

  protected isPlanChecked(id: string): boolean {
    return this.plans.isChecked(id, this.today());
  }

  protected readonly todaySessions = computed(() => this.sessions.forDate(this.today()));
  protected readonly todayMinutes = computed(() => this.sessions.totalMinutesForDate(this.today()));
  protected readonly todayPlans = computed(() => this.plans.forDate(this.today()));
  protected readonly isSkipToday = computed(() => this.restDays.isRest(this.today()));

  protected readonly showSkipUi = computed(() =>
    this.isSkipToday() && !this.skipRestOverride() && this.todayMinutes() === 0 && !this.timer.isRunning()
  );

  protected readonly streak = computed(() => calculateStreak({
    sessionDates: new Set(this.sessions.sessions().map(s => s.date)),
    plannedDates: new Set(this.plans.plans().map(p => p.date)),
    restDays: new Set(this.restDays.days()),
    today: this.today()
  }));

  protected elapsedDisplay = computed(() => formatElapsed(this.timer.elapsedSeconds()));

  /**
   * Timer tier (1–4) escalates as the session gets longer. Drives the colour
   * shift on the timer card and a small encouraging message under the time.
   */
  protected timerTier = computed(() => {
    const min = Math.floor(this.timer.elapsedSeconds() / 60);
    if (min < 10) return 1;
    if (min < 25) return 2;
    if (min < 45) return 3;
    return 4;
  });
  protected tierMsg = computed(() => {
    switch (this.timerTier()) {
      case 1: return 'engine warming 🔥';
      case 2: return "you're in it now ✨";
      case 3: return 'absolutely cooking 🌶️';
      case 4: return 'don\'t you dare stop 🏎️💨';
    }
  });

  // ---- Timer ceremony ----
  // We gate the visual transition between start/stop on a separate signal
  // so the press animation can complete BEFORE the @if branch in the template
  // swaps. Otherwise pressing start would destroy the button mid-animation.
  protected ceremonyState = signal<'idle' | 'starting' | 'stopping'>('idle');

  /** What the template should display: running or not. Lags behind the real
      timer state during the ceremony (~750ms) so animations finish in place. */
  protected displayRunning = computed(() => {
    if (this.ceremonyState() === 'starting') return false;  // still showing start button
    if (this.ceremonyState() === 'stopping') return true;   // still showing stop button
    return this.timer.isRunning();
  });

  protected onPrimaryClick(): void {
    if (this.ceremonyState() !== 'idle') return;  // already in transition

    if (this.timer.isRunning()) {
      // STOP ceremony
      this.ceremonyState.set('stopping');
      setTimeout(() => {
        this.stopTimer();
        this.ceremonyState.set('idle');
      }, 700);
    } else {
      // START ceremony
      this.ceremonyState.set('starting');
      setTimeout(() => {
        this.timer.start();
        this.ceremonyState.set('idle');
      }, 750);
    }
  }

  private async stopTimer(): Promise<void> {
    const result = this.timer.stop();
    if (!result) return;
    const start = new Date(result.startMs);
    const end = new Date(result.endMs);
    this.sessions.create({
      date: toIsoDate(start),
      startTime: toIsoTime(start),
      endTime: toIsoTime(end),
      durationMinutes: result.durationMinutes,
      notes: ''
    });
  }

  protected showStartFromSkip(): void { this.skipRestOverride.set(true); }

  // ---- Modals ----
  protected openAddModal(): void { this.showAddModal.set(true); }
  protected closeAddModal(): void { this.showAddModal.set(false); }
  protected async onAddSave(input: Omit<Session, 'id'>): Promise<void> {
    this.sessions.create(input); this.closeAddModal();
  }
  protected openEdit(s: Session): void { this.editingSession.set(s); }
  protected closeEdit(): void { this.editingSession.set(null); }
  protected async onEditSave(input: Omit<Session, 'id'>): Promise<void> {
    const cur = this.editingSession(); if (!cur) return;
    this.sessions.update(cur.id, input); this.closeEdit();
  }
  protected async onEditDelete(): Promise<void> {
    const cur = this.editingSession(); if (!cur) return;
    if (!confirm(T.delete + '?')) return;
    this.sessions.delete(cur.id); this.closeEdit();
  }

  // ---- Session display ----
  protected sessionTimeLabel(s: Session): string {
    if (s.startTime && s.endTime) return `${s.startTime} – ${s.endTime}`;
    return formatDuration(s.durationMinutes);
  }
  protected sessionHeadline = (s: Session) => sessionHeadline(s.durationMinutes);
  protected sessionSecondary = (s: Session) => sessionDurationSecondary(s.durationMinutes);
  protected formatDur = formatDuration;
}
