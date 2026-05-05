import { Injectable, computed, effect, signal } from '@angular/core';

const STORAGE_KEY = 'frog-streak.activeStart';

/**
 * Stores the in-progress session start time in localStorage so it survives
 * page reloads. When the user hits "stop", we'll convert it into a real
 * Session via SessionsService.
 *
 * The display only updates by the MINUTE, never seconds - that was stressful.
 */
@Injectable({ providedIn: 'root' })
export class TimerService {
  /** Timestamp (ms) when the current session started, or null if not running. */
  readonly activeStart = signal<number | null>(this.loadFromStorage());

  /** Tick signal that updates once a minute (for elapsed display). */
  readonly now = signal<number>(Date.now());

  /** Elapsed seconds since the timer was started, or 0 if not running. */
  readonly elapsedSeconds = computed(() => {
    const start = this.activeStart();
    if (start === null) return 0;
    return Math.max(0, Math.floor((this.now() - start) / 1000));
  });

  constructor() {
    effect(() => {
      const v = this.activeStart();
      if (v === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(v));
    });

    // Tick every 30s. When the timer is running, this updates the elapsed
    // display once a minute. When idle, it just bumps `now` so any computed
    // that depends on it (like today()) sees the midnight rollover.
    setInterval(() => {
      const start = this.activeStart();
      if (start === null) {
        this.now.set(Date.now());
        return;
      }
      // Only bump when we cross a minute boundary, so the elapsed display
      // doesn't flicker between updates.
      const sec = Math.floor((Date.now() - start) / 1000);
      if (sec % 60 < 30) this.now.set(Date.now());
    }, 30_000);
  }

  start(): void {
    if (this.activeStart() === null) {
      this.activeStart.set(Date.now());
      this.now.set(Date.now());
    }
  }

  stop(): { startMs: number; endMs: number; durationMinutes: number } | null {
    const start = this.activeStart();
    if (start === null) return null;
    const end = Date.now();
    this.activeStart.set(null);
    return {
      startMs: start,
      endMs: end,
      // Round up so a 4m32s session is recorded as 5 minutes.
      durationMinutes: Math.max(1, Math.ceil((end - start) / 60000))
    };
  }

  cancel(): void { this.activeStart.set(null); }

  isRunning(): boolean { return this.activeStart() !== null; }

  private loadFromStorage(): number | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
}
