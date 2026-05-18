// One-time migration from data.json → SQLite.
// Safe to delete this file (and its require in server.js) once data.db is populated.

const fs   = require('fs');
const path = require('path');
const { db, q } = require('./db');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

function migrate() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const existing = db.prepare('SELECT COUNT(*) as n FROM sessions').get().n
                   + db.prepare('SELECT COUNT(*) as n FROM plans').get().n;
    if (existing > 0) return;

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    db.transaction(() => {
      for (const s of (data.sessions || [])) {
        q.upsertSession.run({
          id: s.id, date: s.date,
          startTime: s.startTime ?? null, endTime: s.endTime ?? null,
          durationMinutes: s.durationMinutes ?? 0, notes: s.notes ?? '',
        });
      }
      for (const p of (data.plans || [])) {
        q.upsertPlan.run({
          id: p.id, date: p.date, text: p.text ?? '',
          orderIndex: p.orderIndex ?? 0, checkedDate: p.checkedDate ?? null,
        });
      }
      for (const d of (data.restDays || [])) q.upsertRestDay.run(d);
      const ua = data.updatedAt || {};
      q.setMeta.run('sessions_updated_at',  ua.sessions  || 0);
      q.setMeta.run('plans_updated_at',     ua.plans     || 0);
      q.setMeta.run('rest_days_updated_at', ua.restDays  || 0);
    })();
    console.log('Migrated data.json → data.db');
  } catch (e) {
    console.error('Migration failed:', e.message);
  }
}

module.exports = { migrate };
