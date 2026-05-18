const path    = require('path');
const express = require('express');
const cors    = require('cors');

const { db, q, sessionFromRow, planFromRow, getUpdatedAt } = require('./db');
const { migrate } = require('./migrate'); // delete this line (and migrate.js) after first run

const PORT = process.env.PORT || 3333;

migrate();

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

app.get('/api/health',  (_req, res) => res.json({ ok: true }));
app.get('/api/version', (_req, res) => res.json({ updatedAt: getUpdatedAt() }));
app.get('/api/state',   (_req, res) => res.json({
  sessions:  q.allSessions.all().map(sessionFromRow),
  plans:     q.allPlans.all().map(planFromRow),
  restDays:  q.allRestDays.all().map(r => r.date),
  updatedAt: getUpdatedAt(),
}));

// ── Batch endpoint ───────────────────────────────────────────────────────────

const VALID = new Set(['sessions', 'plans', 'restDays']);

app.post('/api/batch', (req, res) => {
  const ops = req.body;
  if (!Array.isArray(ops) || ops.length === 0)
    return res.status(400).json({ error: 'expected non-empty array' });

  const now = Date.now();

  try {
    db.transaction(() => {
      const touched = new Set();

      for (const op of ops) {
        if (!VALID.has(op?.collection)) continue;

        if (op.op === 'upsert') {
          if (op.collection === 'sessions' && op.item?.id) {
            q.upsertSession.run({
              id: op.item.id, date: op.item.date,
              startTime: op.item.startTime ?? null, endTime: op.item.endTime ?? null,
              durationMinutes: op.item.durationMinutes ?? 0, notes: op.item.notes ?? '',
            });
            touched.add('sessions');
          } else if (op.collection === 'plans' && op.item?.id) {
            q.upsertPlan.run({
              id: op.item.id, date: op.item.date, text: op.item.text ?? '',
              orderIndex: op.item.orderIndex ?? 0, checkedDate: op.item.checkedDate ?? null,
            });
            touched.add('plans');
          } else if (op.collection === 'restDays' && op.date) {
            q.upsertRestDay.run(op.date);
            touched.add('restDays');
          }

        } else if (op.op === 'delete') {
          if (op.collection === 'sessions' && op.id) {
            q.deleteSession.run(op.id);
            touched.add('sessions');
          } else if (op.collection === 'plans' && op.id) {
            q.deletePlan.run(op.id);
            touched.add('plans');
          } else if (op.collection === 'restDays' && op.date) {
            q.deleteRestDay.run(op.date);
            touched.add('restDays');
          }
        }
      }

      for (const col of touched) {
        const key = col === 'restDays' ? 'rest_days_updated_at' : `${col}_updated_at`;
        q.setMeta.run(key, now);
      }
    })();
  } catch (e) {
    console.error('batch failed:', e.message);
    return res.status(500).json({ error: 'batch failed' });
  }

  res.json({ updatedAt: getUpdatedAt() });
});

// ── Static frontend ──────────────────────────────────────────────────────────

if (process.env.SERVE_FRONTEND === '1') {
  const dist = process.env.FRONTEND_DIST
    || path.join(__dirname, '..', 'frontend', 'dist', 'streak-app', 'browser');
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(dist, 'index.html'), err => {
      if (err) res.status(404).send('build the frontend first.');
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐸 streakling running on :${PORT}`);
});
