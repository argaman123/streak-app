import { Component, computed, inject, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SessionsService } from '../../services/sessions.service';
import { PlansService } from '../../services/plans.service';
import { TimerService } from '../../services/timer.service';
import { RestDaysService } from '../../services/rest-days.service';
import { T } from '../../services/strings';
import {
  todayIso, prettyDate, formatDuration, formatElapsed,
  calculateStreak, toIsoTime, toIsoDate
} from '../../services/date.utils';

import { ModalComponent } from '../../components/modal/modal.component';
import { SessionFormComponent } from '../../components/session-form/session-form.component';
import { MascotComponent } from '../../components/mascot/mascot.component';
import { Session } from '../../models/session.model';

import { EngineComponent } from '../../components/engine/engine.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent, SessionFormComponent, MascotComponent, EngineComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('mascotContainer') private mascotContainer?: ElementRef<HTMLElement>;

  protected sessions = inject(SessionsService);
  protected plans = inject(PlansService);
  protected timer = inject(TimerService);
  protected restDays = inject(RestDaysService);
  protected T = T;

  ngAfterViewInit(): void {
    this.setMascotLift();
  }

  // Compute how far up the frog must sit so its feet land exactly on the streak
  // card's top edge. Uses offsetTop (layout coords, unaffected by CSS animations)
  // so the measurement is correct even while fade-up animations are running.
  private setMascotLift(): void {
    const container = this.mascotContainer?.nativeElement;
    if (!container) return;
    const streakCard = document.querySelector('.streak-card') as HTMLElement | null;
    if (!streakCard) return;

    const streakCardTop = this.absTop(streakCard);
    // container.top = absTop(container), container.bottom = absTop(container) + offsetHeight
    // With transform-origin: bottom center, translateY(-lift) moves the BOTTOM up by lift.
    // We want: container.bottom - lift = streakCard.top + 4 (4 px below card top = "sits on it")
    const containerBottom = this.absTop(container) + container.offsetHeight;
    const lift = Math.max(containerBottom - streakCardTop, 60);
    container.style.setProperty('--mascot-lift', `${lift}px`);
  }

  private absTop(el: HTMLElement): number {
    let top = 0;
    let cur: HTMLElement | null = el;
    while (cur) { top += cur.offsetTop; cur = cur.offsetParent as HTMLElement | null; }
    return top;
  }

  protected readonly today = computed(() => { this.timer.now(); return todayIso(); });
  protected readonly prettyToday = computed(() => prettyDate(this.today()));

  // Modal state
  protected showAddModal = signal(false);
  protected editingSession = signal<Session | null>(null);
  protected skipRestOverride = signal(false);

  // Post-stop "what did you learn?" prompt
  protected postStopSession = signal<Session | null>(null);
  protected postStopNotes = '';

  protected togglePlanCheck(id: string): void { this.plans.toggleCheck(id, this.today()); }
  protected isPlanChecked(id: string): boolean { return this.plans.isChecked(id, this.today()); }

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
  protected ceremonyState = signal<'idle' | 'starting' | 'stopping'>('idle');
  protected displayRunning = computed(() => {
    if (this.ceremonyState() === 'starting') return false;
    if (this.ceremonyState() === 'stopping') return true;
    return this.timer.isRunning();
  });

  // Class-based press state for the big button. Guarantees the
  // squish-in is visible for at least PRESS_MIN_MS even on the
  // briefest tap — :active alone truncates and the release
  // transition makes the button look like it's springing AWAY.
  protected pressed = signal(false);
  private pressStartMs = 0;
  private pressReleaseTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly PRESS_MIN_MS = 140;

  protected onPressStart(): void {
    if (this.pressReleaseTimer) {
      clearTimeout(this.pressReleaseTimer);
      this.pressReleaseTimer = null;
    }
    this.pressStartMs = performance.now();
    this.pressed.set(true);
  }

  protected onPressEnd(): void {
    if (!this.pressed()) return;
    const held = performance.now() - this.pressStartMs;
    const remaining = Math.max(0, HomeComponent.PRESS_MIN_MS - held);
    if (remaining === 0) {
      this.pressed.set(false);
    } else {
      this.pressReleaseTimer = setTimeout(() => {
        this.pressed.set(false);
        this.pressReleaseTimer = null;
      }, remaining);
    }
  }

  protected onPrimaryClick(): void {
    if (this.ceremonyState() !== 'idle') return;

    if (this.timer.isRunning()) {
      this.ceremonyState.set('stopping');
      setTimeout(() => {
        this.stopTimer();
        this.ceremonyState.set('idle');
      }, 700);
    } else {
      this.ceremonyState.set('starting');
      setTimeout(() => {
        this.timer.start();
        this.ceremonyState.set('idle');
      }, 750);
    }
  }

  /**
   * After stopping, save the session and immediately offer a small popup
   * asking what she learned. She can fill it in or skip — either is fine.
   */
  private async stopTimer(): Promise<void> {
    const result = this.timer.stop();
    if (!result) return;
    const start = new Date(result.startMs);
    const end = new Date(result.endMs);
    const created = this.sessions.create({
      date: toIsoDate(start),
      startTime: toIsoTime(start),
      endTime: toIsoTime(end),
      durationMinutes: result.durationMinutes,
      notes: ''
    });
    if (created) {
      this.postStopNotes = '';
      this.postStopSession.set(created);
    }
  }

  protected savePostStopNotes(): void {
    const s = this.postStopSession();
    if (!s) return;
    const note = this.postStopNotes.trim();
    if (note.length > 0) {
      this.sessions.update(s.id, { ...s, notes: note });
    }
    this.postStopSession.set(null);
    this.postStopNotes = '';
  }

  protected dismissPostStop(): void {
    this.postStopSession.set(null);
    this.postStopNotes = '';
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
  protected sessionDuration(s: Session): string { return formatDuration(s.durationMinutes); }
  protected sessionHours(s: Session): string | null {
    if (s.startTime && s.endTime) return `${s.startTime} – ${s.endTime}`;
    return null;
  }
  protected formatDur = formatDuration;
}
