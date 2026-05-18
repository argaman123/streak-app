import { Injectable, inject } from '@angular/core';
import { Session } from '../models/session.model';
import { StoreService } from './store.service';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private store = inject(StoreService);
  readonly sessions = this.store.sessions;

  create(input: Omit<Session, 'id'>): Session {
    const s: Session = { ...input, id: newId() };
    this.store.upsertSession(s);
    return s;
  }

  update(id: string, changes: Partial<Session>): void {
    const s = this.store.sessions().find(s => s.id === id);
    if (s) this.store.upsertSession({ ...s, ...changes });
  }

  delete(id: string): void {
    this.store.deleteSession(id);
  }

  forDate(date: string): Session[] {
    return this.sessions()
      .filter(s => s.date === date)
      .sort((a, b) => {
        const ta = a.startTime ? timeToMin(a.startTime) : 9999;
        const tb = b.startTime ? timeToMin(b.startTime) : 9999;
        return tb - ta;
      });
  }

  totalMinutesForDate(date: string): number {
    return this.forDate(date).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  }
}
