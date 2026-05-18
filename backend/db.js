const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const DATA_DB = process.env.DATA_DB || path.join(__dirname, 'data.db');

fs.mkdirSync(path.dirname(DATA_DB), { recursive: true });

const db = new Database(DATA_DB);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id               TEXT PRIMARY KEY,
    date             TEXT NOT NULL,
    start_time       TEXT,
    end_time         TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    notes            TEXT    NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS plans (
    id           TEXT PRIMARY KEY,
    date         TEXT NOT NULL,
    text         TEXT NOT NULL DEFAULT '',
    order_index  INTEGER NOT NULL DEFAULT 0,
    checked_date TEXT
  );
  CREATE TABLE IF NOT EXISTS rest_days (
    date TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO meta VALUES ('sessions_updated_at',  0);
  INSERT OR IGNORE INTO meta VALUES ('plans_updated_at',     0);
  INSERT OR IGNORE INTO meta VALUES ('rest_days_updated_at', 0);
`);

const q = {
  upsertSession: db.prepare(`
    INSERT OR REPLACE INTO sessions (id, date, start_time, end_time, duration_minutes, notes)
    VALUES (@id, @date, @startTime, @endTime, @durationMinutes, @notes)
  `),
  deleteSession:  db.prepare('DELETE FROM sessions WHERE id = ?'),

  upsertPlan: db.prepare(`
    INSERT OR REPLACE INTO plans (id, date, text, order_index, checked_date)
    VALUES (@id, @date, @text, @orderIndex, @checkedDate)
  `),
  deletePlan:    db.prepare('DELETE FROM plans WHERE id = ?'),

  upsertRestDay: db.prepare('INSERT OR IGNORE INTO rest_days (date) VALUES (?)'),
  deleteRestDay: db.prepare('DELETE FROM rest_days WHERE date = ?'),

  setMeta:     db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)'),
  allSessions: db.prepare('SELECT * FROM sessions'),
  allPlans:    db.prepare('SELECT * FROM plans'),
  allRestDays: db.prepare('SELECT date FROM rest_days'),
  allMeta:     db.prepare('SELECT key, value FROM meta'),
};

function sessionFromRow(r) {
  return {
    id:              r.id,
    date:            r.date,
    startTime:       r.start_time,
    endTime:         r.end_time,
    durationMinutes: r.duration_minutes,
    notes:           r.notes,
  };
}

function planFromRow(r) {
  const p = { id: r.id, date: r.date, text: r.text, orderIndex: r.order_index };
  if (r.checked_date) p.checkedDate = r.checked_date;
  return p;
}

function getUpdatedAt() {
  const out = { sessions: 0, plans: 0, restDays: 0 };
  for (const { key, value } of q.allMeta.all()) {
    if (key === 'sessions_updated_at')  out.sessions = value;
    if (key === 'plans_updated_at')     out.plans    = value;
    if (key === 'rest_days_updated_at') out.restDays = value;
  }
  return out;
}

module.exports = { db, q, sessionFromRow, planFromRow, getUpdatedAt };
