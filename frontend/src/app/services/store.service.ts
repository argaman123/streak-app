import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Session } from '../models/session.model';
import { Plan } from '../models/plan.model';
import { API_BASE } from './api.config';

const LS_KEY      = 'fs.state';
const DEBOUNCE_MS = 1800;
const REFRESH_MS  = 30000;

interface PersistedState {
  sessions: Session[];
  plans:    Plan[];
  restDays: string[];
  version:  number;
}

interface DirtyFlags { sessions: boolean; plans: boolean; restDays: boolean; }

export type Status = 'idle' | 'saving' | 'local' | 'loading';

/**
 * Single store for everything.
 *
 * Writes:
 *  - On every mutation: write to localStorage immediately, mark the changed
 *    collection dirty, schedule a 1.8s debounced push to the server.
 *  - Rapid changes coalesce into one PUT containing the latest state.
 *  - Only the changed collection is sent (sessions / plans / restDays),
 *    never the whole state.
 *  - If a mutation lands during a server call, another push is scheduled
 *    after that one finishes — nothing is dropped.
 *
 * Reads:
 *  - Every 30s tick: GET /api/version (a few bytes). If the server is ahead
 *    of us, GET /api/state to pull. If we have unsent changes, push instead.
 *  - On boot: load from localStorage immediately, then refresh in background.
 *
 * Status is exposed as a signal for the UI badge.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private http = inject(HttpClient);

  readonly sessions = signal<Session[]>([]);
  readonly plans    = signal<Plan[]>([]);
  readonly restDays = signal<string[]>([]);
  readonly status   = signal<Status>('idle');

  private version = 0;
  private dirty: DirtyFlags = { sessions: false, plans: false, restDays: false };
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadLocal();
    this.refreshFromServer();
    setInterval(() => this.tick(), REFRESH_MS);
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
      restDays: this.restDays(), version: this.version
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as PersistedState;
      this.sessions.set(s.sessions || []);
      this.plans.set   (s.plans    || []);
      this.restDays.set(s.restDays || []);
      this.version = s.version || 0;
    } catch {}
  }

  private async pushDirty(): Promise<void> {
    this.timer = null;
    if (!this.anyDirty()) { this.status.set('idle'); return; }

    const sending = { ...this.dirty };
    this.dirty = { sessions: false, plans: false, restDays: false };

    const calls: Array<{ key: keyof DirtyFlags; promise: Promise<{ version: number } | null> }> = [];
    if (sending.sessions) calls.push({ key: 'sessions',
      promise: firstValueFrom(this.http.put<{ version: number }>(`${API_BASE}/sessions`, this.sessions())).catch(() => null) });
    if (sending.plans)    calls.push({ key: 'plans',
      promise: firstValueFrom(this.http.put<{ version: number }>(`${API_BASE}/plans`, this.plans())).catch(() => null) });
    if (sending.restDays) calls.push({ key: 'restDays',
      promise: firstValueFrom(this.http.put<{ version: number }>(`${API_BASE}/rest-days`, this.restDays())).catch(() => null) });

    const results = await Promise.all(calls.map(c => c.promise));
    let failed = false;
    let latestVersion = this.version;
    for (let i = 0; i < calls.length; i++) {
      const r = results[i];
      if (r === null) { this.dirty[calls[i].key] = true; failed = true; }
      else            { latestVersion = Math.max(latestVersion, r.version); }
    }

    if (failed) {
      this.status.set('local');
    } else {
      this.version = latestVersion;
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

  private async refreshFromServer(): Promise<void> {
    if (this.anyDirty()) return;
    try {
      const { version: serverVersion } = await firstValueFrom(
        this.http.get<{ version: number }>(`${API_BASE}/version`)
      );
      if (serverVersion <= this.version) {
        if (this.status() !== 'idle') this.status.set('idle');
        return;
      }
      this.status.set('loading');
      const s = await firstValueFrom(this.http.get<PersistedState>(`${API_BASE}/state`));
      this.sessions.set(s.sessions || []);
      this.plans.set   (s.plans    || []);
      this.restDays.set(s.restDays || []);
      this.version = s.version;
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
