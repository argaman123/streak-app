import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Session } from '../models/session.model';
import { Plan } from '../models/plan.model';
import { API_BASE } from './api.config';

const LS_KEY      = 'fs.state';
const DEBOUNCE_MS = 1500;
const POLL_MS     = 12000;

interface UpdatedAt { sessions: number; plans: number; restDays: number; }
const ZERO_TIMES: UpdatedAt = { sessions: 0, plans: 0, restDays: 0 };

interface PersistedState {
  sessions: Session[];
  plans:    Plan[];
  restDays: string[];
  updatedAt: UpdatedAt;
}

interface DirtyFlags { sessions: boolean; plans: boolean; restDays: boolean; }

export type Status = 'idle' | 'saving' | 'local' | 'loading';

/**
 * Single store for everything. Per-collection updatedAt timestamps mean
 * the client can know exactly which collection is stale and only refetch
 * the things that changed.
 *
 * Sync model:
 *  - Mutations write localStorage immediately, debounce 1.5s, then push
 *    only the changed collection(s).
 *  - The PUT response carries the new updatedAt map so the client never
 *    races itself.
 *  - Background poll: every 12s, fetch /api/version. If any collection's
 *    server time is newer than ours AND that collection isn't dirty
 *    locally, refetch the whole state and adopt it.
 *  - On focus / visibility change / online event, poll immediately so a
 *    second device's changes show up the moment the user looks at the app.
 *
 * Conflict policy: NEWEST WINS. If a collection is dirty locally and the
 * server is also ahead, we keep our pending mutation (the user's most
 * recent edit on this device) and let it overwrite on next push.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private http = inject(HttpClient);

  readonly sessions = signal<Session[]>([]);
  readonly plans    = signal<Plan[]>([]);
  readonly restDays = signal<string[]>([]);
  readonly status   = signal<Status>('idle');

  private updatedAt: UpdatedAt = { ...ZERO_TIMES };
  private dirty: DirtyFlags = { sessions: false, plans: false, restDays: false };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;

  constructor() {
    this.loadLocal();
    // Defer first refresh slightly so the UI paints fast on cold load.
    setTimeout(() => this.refreshFromServer(), 50);
    setInterval(() => this.tick(), POLL_MS);

    // Refresh-on-focus: when the user comes back to the tab/PWA, the other
    // device may have made changes minutes/hours ago. Poll right now.
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.tick();
      });
      window.addEventListener('focus',  () => this.tick());
      window.addEventListener('online', () => this.tick());
    }
  }

  setSessions(list: Session[]): void { this.sessions.set(list); this.dirty.sessions = true; this.commit(); }
  setPlans   (list: Plan[]):    void { this.plans.set(list);    this.dirty.plans    = true; this.commit(); }
  setRestDays(list: string[]):  void { this.restDays.set(list); this.dirty.restDays = true; this.commit(); }

  /** Force an immediate push (used on tab close). */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.anyDirty()) await this.pushDirty();
  }

  private anyDirty(): boolean {
    return this.dirty.sessions || this.dirty.plans || this.dirty.restDays;
  }

  private commit(): void {
    this.saveLocal();
    this.status.set('saving');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.pushDirty(), DEBOUNCE_MS);
  }

  private saveLocal(): void {
    const state: PersistedState = {
      sessions: this.sessions(), plans: this.plans(),
      restDays: this.restDays(), updatedAt: this.updatedAt
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<PersistedState> & { version?: number };
      this.sessions.set(s.sessions || []);
      this.plans.set   (s.plans    || []);
      this.restDays.set(s.restDays || []);
      // Migrate from old single-version field — start fresh, server will provide.
      this.updatedAt = { ...ZERO_TIMES, ...(s.updatedAt || {}) };
    } catch {}
  }

  private async pushDirty(): Promise<void> {
    this.timer = null;
    if (!this.anyDirty()) { this.status.set('idle'); return; }
    if (this.inFlight) {
      // Another push is already running — re-schedule ourselves at the end.
      return;
    }
    this.inFlight = true;

    const sending = { ...this.dirty };
    this.dirty = { sessions: false, plans: false, restDays: false };

    type Resp = { updatedAt: UpdatedAt } | null;
    const calls: Array<{ key: keyof DirtyFlags; promise: Promise<Resp> }> = [];
    if (sending.sessions) calls.push({ key: 'sessions',
      promise: firstValueFrom(this.http.put<{ updatedAt: UpdatedAt }>(`${API_BASE}/sessions`, this.sessions())).catch(() => null) });
    if (sending.plans)    calls.push({ key: 'plans',
      promise: firstValueFrom(this.http.put<{ updatedAt: UpdatedAt }>(`${API_BASE}/plans`, this.plans())).catch(() => null) });
    if (sending.restDays) calls.push({ key: 'restDays',
      promise: firstValueFrom(this.http.put<{ updatedAt: UpdatedAt }>(`${API_BASE}/rest-days`, this.restDays())).catch(() => null) });

    const results = await Promise.all(calls.map(c => c.promise));
    let failed = false;
    for (let i = 0; i < calls.length; i++) {
      const r = results[i];
      if (r === null) { this.dirty[calls[i].key] = true; failed = true; }
      else            { this.updatedAt = { ...this.updatedAt, ...r.updatedAt }; }
    }

    this.inFlight = false;

    if (failed) {
      this.status.set('local');
    } else {
      this.saveLocal();
      this.status.set('idle');
    }

    // Mutations that arrived during the network call need their own push.
    if (this.anyDirty()) {
      this.status.set('saving');
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.pushDirty(), DEBOUNCE_MS);
    }
  }

  /**
   * Poll the server and adopt anything newer that we haven't dirtied.
   * Per-collection so a pending session change doesn't block a plan refresh.
   */
  private async refreshFromServer(): Promise<void> {
    try {
      const v = await firstValueFrom(
        this.http.get<{ updatedAt: UpdatedAt }>(`${API_BASE}/version`)
      );
      const server = { ...ZERO_TIMES, ...v.updatedAt };

      const needSessions = server.sessions > this.updatedAt.sessions && !this.dirty.sessions;
      const needPlans    = server.plans    > this.updatedAt.plans    && !this.dirty.plans;
      const needRest     = server.restDays > this.updatedAt.restDays && !this.dirty.restDays;

      if (!needSessions && !needPlans && !needRest) {
        if (this.status() === 'local') this.status.set('idle');
        return;
      }

      this.status.set('loading');
      const s = await firstValueFrom(
        this.http.get<PersistedState>(`${API_BASE}/state`)
      );
      if (needSessions) { this.sessions.set(s.sessions || []); this.updatedAt.sessions = server.sessions; }
      if (needPlans)    { this.plans.set   (s.plans    || []); this.updatedAt.plans    = server.plans;    }
      if (needRest)     { this.restDays.set(s.restDays || []); this.updatedAt.restDays = server.restDays; }
      this.saveLocal();
      this.status.set('idle');
    } catch {
      this.status.set('local');
    }
  }

  private async tick(): Promise<void> {
    if (this.anyDirty()) await this.pushDirty();
    else                 await this.refreshFromServer();
  }
}
