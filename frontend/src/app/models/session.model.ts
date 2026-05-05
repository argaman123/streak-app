// A learning session - one chunk of focused study time.
export interface Session {
  id: string;
  date: string;              // YYYY-MM-DD
  startTime: string | null;  // 'HH:mm' or null if user only entered duration
  endTime: string | null;
  durationMinutes: number;
  notes: string;
}
