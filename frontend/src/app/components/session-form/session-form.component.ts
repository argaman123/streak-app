import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Session } from '../../models/session.model';
import { todayIso } from '../../services/date.utils';
import { T } from '../../services/strings';

/**
 * Reusable form for a session. Used for both adding and editing.
 *
 * Two ways of recording time:
 *   - Specify start + end times (we compute duration)
 *   - Specify a duration directly
 */
@Component({
  selector: 'app-session-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-form.component.html',
  styleUrl: './session-form.component.scss'
})
export class SessionFormComponent implements OnInit {
  @Input() initial?: Session;
  @Input() defaultDate?: string;

  @Output() save = new EventEmitter<Omit<Session, 'id'>>();
  @Output() cancel = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();

  protected T = T;

  date = '';
  mode: 'times' | 'duration' = 'times';
  startTime = '';
  endTime = '';
  durationMinutes = 60;
  notes = '';

  ngOnInit(): void {
    if (this.initial) {
      this.date = this.initial.date;
      this.startTime = this.initial.startTime || '';
      this.endTime = this.initial.endTime || '';
      this.durationMinutes = this.initial.durationMinutes || 60;
      this.notes = this.initial.notes || '';
      this.mode = this.initial.startTime && this.initial.endTime ? 'times' : 'duration';
    } else {
      this.date = this.defaultDate || todayIso();
    }
  }

  onSubmit(): void {
    let durationMinutes = this.durationMinutes;
    let startTime: string | null = null;
    let endTime: string | null = null;

    if (this.mode === 'times' && this.startTime && this.endTime) {
      startTime = this.startTime;
      endTime = this.endTime;
      durationMinutes = this.computeMinutes(this.startTime, this.endTime);
    }

    if (!this.date || !durationMinutes || durationMinutes < 1) return;

    this.save.emit({
      date: this.date,
      startTime,
      endTime,
      durationMinutes,
      notes: this.notes.trim()
    });
  }

  /** Minutes between two 'HH:mm' strings. Wraps if end < start (overnight). */
  private computeMinutes(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins;
  }
}
