import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Session } from '../models/session.model';
import { Plan } from '../models/plan.model';
import { API_BASE } from './api.config';

const LS_KEY         = 'fs.state';
const DEBOUNCE_MS    = 1500;
const POLL_MS        = 30_000;
const HEALTH_POLL_MS = 8_000;

interface UpdatedAt { sessions: number; plans: number; restDays: number; }
const ZERO_TIMES: UpdatedAt = { sessions: 0, plans: 0, restDays: 0 };

interface FullState {
  sessions:  Session[];
  plans:     Plan[];
  restDays:  string[];
  updatedAt: UpdatedAt;
}

// ── Op types ─────────────────────────────────────────────────────────────────

export type Op =
  | { op: 'upsert'; collection: 'sessions'; item: Session }
  | { op: 'upsert'; collection: 'plans';    item: Plan    }
  | { op: 'upsert'; collection: 'restDays'; date: string  }
  | { op: 'delete'; collection: 'sessions'; id:   string  }
  | { op: 'delete'; collection: 'plans';    id:   string  }
  | { op: 'delete'; collection: 'restDays'; date: string  };

function opKey(op: Op): string {
  if (op.collection === 'restDays') return `restDays:${op.date}`;
  return `${op.collection}:${op.op === 'upsert' ? op.item.id : op.id}`;
}

// Last write per key wins — collapses edit→edit, upsert→delete, etc.
function compact(ops: Op[]): Op[] {
  const seen = new Map<string, Op>();
  for (const op of ops) seen.set(opKey(op), op);
  return Array.from(seen.values());
}

// ── Recovery diff ─────────────────────────────────────────────────────────────
// Produces the minimal op set to bring server in line with local state.

function diffToOps(local: FullState, server: FullState): Op[] {
  const ops: Op[] = [];

  const serverSessions = new Map(server.sessions.map(s => [s.id, s]));
  const localSessions  = new Map(local.sessions.map(s => [s.id, s]));
  for (const s of local.sessions) {
    const sv = serverSessions.get(s.id);
    if (!sv || JSON.stringify(sv) !== JSON.stringify(s))
      ops.push({ op: 'upsert', collection: 'sessions', item: s });
  }
  for (const { id } of server.sessions) {
    if (!localSessions.has(id)) ops.push({ op: 'delete', collection: 'sessions', id });
  }

  const serverPlans = new Map(server.plans.map(p => [p.id, p]));
  const localPlans  = new Map(local.plans.map(p => [p.id, p]));
  for (const p of local.plans) {
    const sv = serverPlans.get(p.id);
    if (!sv || JSON.stringify(sv) !== JSON.stringify(p))
      ops.push({ op: 'upsert', collection: 'plans', item: p });
  }
  for (const { id } of server.plans) {
    if (!localPlans.has(id)) ops.push({ op: 'delete', collection: 'plans', id });
  }

  const serverRest = new Set(server.restDays);
  const localRest  = new Set(local.restDays);
  for (const date of local.restDays) {
    if (!serverRest.has(date)) ops.push({ op: 'upsert', collection: 'restDays', date });
  }
  for (const date of server.restDays) {
    if (!localRest.has(date)) ops.push({ op: 'delete', collection: 'restDays', date });
  }

  return ops;
}

export type Status = 'idle' | 'saving' | 'local' | 'loading';

/**
 * Single store for all app state.
 *
 * Sync model:
 *  - Mutations update signals + localStorage immediately, push an op to
 *    pendingOps, then debounce 1.5 s before flushing.
 *  - Flush: snapshot pendingOps → compact → POST /api/batch (one request).
 *    New mutations during in-flight go into the next batch.
 *  - On batch failure: failed ops are prepended back (newer pending ops win
 *    on the next compact) and retried with exponential backoff.
 *  - Background poll every 12 s: GET /api/version. If server is ahead on a
 *    collection, pull it. If local is ahead (offline edits, server reset),
 *    fetch server state → diff → POST /api/batch with only what diverged.
 *  - On focus / visibility / online: poll immediately.
 *
 * Conflict policy: local wins. If both sides changed the same item, the
 * local version is what gets pushed.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private http = inject(HttpClient);

  readonly sessions = signal<Session[]>([]);
  readonly plans    = signal<Plan[]>([]);
  readonly restDays = signal<string[]>([]);
  readonly status   = signal<Status>('idle');

  private updatedAt: UpdatedAt = { ...ZERO_TIMES };
  private pendingOps: Op[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight  = false;
  private tickBusy  = false;
  private backoffMs = 0;
  private nextPollAllowed = 0;

  constructor() {
    this.loadLocal();
    setTimeout(() => this.tick(), 50);
    setInterval(() => this.tick(), POLL_MS);
    setInterval(() => this.checkAvailability(), HEALTH_POLL_MS);

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.tick();
      });
      window.addEventListener('focus',  () => this.tick());
      window.addEventListener('online', () => {
        this.backoffMs = 0;
        this.nextPollAllowed = 0;
        this.tick();
      });
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  upsertSession(item: Session): void {
    const list = this.sessions();
    const idx  = list.findIndex(s => s.id === item.id);
    this.sessions.set(idx >= 0 ? list.map(s => s.id === item.id ? item : s) : [item, ...list]);
    this.updatedAt.sessions = Date.now();
    this.pendingOps.push({ op: 'upsert', collection: 'sessions', item });
    this.commit();
  }

  deleteSession(id: string): void {
    this.sessions.set(this.sessions().filter(s => s.id !== id));
    this.updatedAt.sessions = Date.now();
    this.pendingOps.push({ op: 'delete', collection: 'sessions', id });
    this.commit();
  }

  upsertPlan(item: Plan): void {
    const list = this.plans();
    const idx  = list.findIndex(p => p.id === item.id);
    this.plans.set(idx >= 0 ? list.map(p => p.id === item.id ? item : p) : [item, ...list]);
    this.updatedAt.plans = Date.now();
    this.pendingOps.push({ op: 'upsert', collection: 'plans', item });
    this.commit();
  }

  deletePlan(id: string): void {
    this.plans.set(this.plans().filter(p => p.id !== id));
    this.updatedAt.plans = Date.now();
    this.pendingOps.push({ op: 'delete', collection: 'plans', id });
    this.commit();
  }

  addRestDay(date: string): void {
    if (this.restDays().includes(date)) return;
    this.restDays.set([...this.restDays(), date]);
    this.updatedAt.restDays = Date.now();
    this.pendingOps.push({ op: 'upsert', collection: 'restDays', date });
    this.commit();
  }

  removeRestDay(date: string): void {
    this.restDays.set(this.restDays().filter(d => d !== date));
    this.updatedAt.restDays = Date.now();
    this.pendingOps.push({ op: 'delete', collection: 'restDays', date });
    this.commit();
  }

  /** Force an immediate flush (used on tab close). */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.pendingOps.length > 0) await this.flushOps();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private commit(): void {
    this.saveLocal();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flushOps(), DEBOUNCE_MS);
  }

  private saveLocal(): void {
    const state: FullState = {
      sessions:  this.sessions(),
      plans:     this.plans(),
      restDays:  this.restDays(),
      updatedAt: this.updatedAt,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<FullState> & { version?: number };
      this.sessions.set(s.sessions ?? []);
      this.plans.set(s.plans       ?? []);
      this.restDays.set(s.restDays ?? []);
      this.updatedAt = { ...ZERO_TIMES, ...(s.updatedAt ?? {}) };
    } catch {}
  }

  private async flushOps(): Promise<void> {
    this.timer = null;
    if (this.pendingOps.length === 0) { this.status.set('idle'); return; }
    if (this.inFlight) return;

    this.inFlight = true;
    this.status.set('saving');

    // Snapshot and drain — mutations during this request go to a fresh queue.
    const batch = compact(this.pendingOps.splice(0));

    try {
      const result = await firstValueFrom(
        this.http.post<{ updatedAt: UpdatedAt }>(`${API_BASE}/batch`, batch)
      );
      this.updatedAt = { ...this.updatedAt, ...result.updatedAt };
      this.backoffMs = 0;
      this.saveLocal();
      this.status.set('idle');
    } catch {
      // Prepend failed ops so newer pending ops win on the next compact.
      this.pendingOps.unshift(...batch);
      this.status.set('local');
      this.backoffMs = Math.min(this.backoffMs ? this.backoffMs * 2 : 15_000, 300_000);
      this.nextPollAllowed = Date.now() + this.backoffMs;
    }

    this.inFlight = false;

    if (this.pendingOps.length > 0) {
      const delay = this.backoffMs > 0 ? Math.max(DEBOUNCE_MS, this.backoffMs) : DEBOUNCE_MS;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flushOps(), delay);
    }
  }

  /**
   * Version check → pull stale collections from server, or push local
   * divergence (offline edits, server reset) via fetch → diff → batch.
   */
  private async refreshFromServer(): Promise<void> {
    try {
      const v = await firstValueFrom(
        this.http.get<{ updatedAt: UpdatedAt }>(`${API_BASE}/version`)
      );
      const server = { ...ZERO_TIMES, ...v.updatedAt };

      const pull = {
        sessions: server.sessions > this.updatedAt.sessions,
        plans:    server.plans    > this.updatedAt.plans,
        restDays: server.restDays > this.updatedAt.restDays,
      };
      const push = {
        sessions: this.updatedAt.sessions > server.sessions,
        plans:    this.updatedAt.plans    > server.plans,
        restDays: this.updatedAt.restDays > server.restDays,
      };

      const anyPull = pull.sessions || pull.plans || pull.restDays;
      const anyPush = push.sessions || push.plans || push.restDays;

      if (!anyPull && !anyPush) {
        if (this.status() === 'local') this.status.set('idle');
        this.backoffMs = 0;
        return;
      }

      // Fetch full server state once — used for both pull and push-diff paths.
      this.status.set('loading');
      const serverState = await firstValueFrom(
        this.http.get<FullState>(`${API_BASE}/state`)
      );

      if (anyPull) {
        if (pull.sessions) { this.sessions.set(serverState.sessions); this.updatedAt.sessions = server.sessions; }
        if (pull.plans)    { this.plans.set(serverState.plans);       this.updatedAt.plans    = server.plans;    }
        if (pull.restDays) { this.restDays.set(serverState.restDays); this.updatedAt.restDays = server.restDays; }
        this.saveLocal();
      }

      if (anyPush) {
        const local: FullState = {
          sessions: this.sessions(), plans: this.plans(),
          restDays: this.restDays(), updatedAt: this.updatedAt,
        };
        const ops = diffToOps(local, serverState);
        if (ops.length > 0) {
          const result = await firstValueFrom(
            this.http.post<{ updatedAt: UpdatedAt }>(`${API_BASE}/batch`, ops)
          );
          this.updatedAt = { ...this.updatedAt, ...result.updatedAt };
          this.saveLocal();
        }
      }

      this.status.set('idle');
      this.backoffMs = 0;
    } catch {
      this.status.set('local');
      this.backoffMs = Math.min(this.backoffMs ? this.backoffMs * 2 : 15_000, 300_000);
      this.nextPollAllowed = Date.now() + this.backoffMs;
    }
  }

  private async checkAvailability(): Promise<void> {
    if (this.status() !== 'local') return;
    if (this.tickBusy) return;
    try {
      await firstValueFrom(this.http.get(`${API_BASE}/health`));
      this.backoffMs = 0;
      this.nextPollAllowed = 0;
      this.tick();
    } catch {}
  }

  private async tick(): Promise<void> {
    if (this.tickBusy || this.inFlight) return;
    if (Date.now() < this.nextPollAllowed) return;
    this.tickBusy = true;
    try {
      if (this.pendingOps.length > 0) await this.flushOps();
      else                             await this.refreshFromServer();
    } finally {
      this.tickBusy = false;
    }
  }
}
