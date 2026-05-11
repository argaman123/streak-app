// Streakling backend.
//
// Per-collection PUT endpoints (/api/sessions, /api/plans, /api/rest-days)
// so the client only sends what changed. Versioning uses a per-collection
// updatedAt timestamp (epoch ms) instead of a single incrementing version,
// so the client can ask "did sessions change since X?" without coupling.
//
// Endpoints:
//   GET  /api/state          -> { sessions, plans, restDays, updatedAt: {sessions,plans,restDays} }
//   GET  /api/version        -> { updatedAt: {sessions,plans,restDays} }   (lightweight poll)
//   PUT  /api/sessions       -> replaces sessions array, bumps sessions.updatedAt
//   PUT  /api/plans          -> replaces plans array,    bumps plans.updatedAt
//   PUT  /api/rest-days      -> replaces restDays array, bumps restDays.updatedAt
//   GET  /api/health         -> { ok: true }

const fs      = require('fs');
const path    = require('path');
const express = require('express');
const cors    = require('cors');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const PORT      = process.env.PORT || 3333;

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function emptyTimes() {
  return { sessions: 0, plans: 0, restDays: 0 };
}

function read() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { sessions: [], plans: [], restDays: [], updatedAt: emptyTimes() };
    }
    const p = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return {
      sessions: p.sessions || [],
      plans:    p.plans    || [],
      restDays: p.restDays || [],
      updatedAt: { ...emptyTimes(), ...(p.updatedAt || {}) }
    };
  } catch (e) {
    console.error('read failed:', e.message);
    return { sessions: [], plans: [], restDays: [], updatedAt: emptyTimes() };
  }
}

// Atomic write: tmp file + rename so a crash mid-write never corrupts data.
function write(state) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Lightweight poll — returns just per-collection timestamps (small payload).
// Client uses this to decide what (if anything) to refetch.
app.get('/api/version', (req, res) => {
  const s = read();
  res.json({ updatedAt: s.updatedAt });
});

// Full state (initial boot, or when version says we're stale)
app.get('/api/state', (req, res) => res.json(read()));

function putCollection(field) {
  return (req, res) => {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'expected array' });
    }
    const s = read();
    s[field] = req.body;
    s.updatedAt[field] = Date.now();
    write(s);
    res.json({ updatedAt: s.updatedAt });
  };
}

app.put('/api/sessions',  putCollection('sessions'));
app.put('/api/plans',     putCollection('plans'));
app.put('/api/rest-days', putCollection('restDays'));

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
  console.log(`🐸 streakling running on :${PORT}  data: ${DATA_FILE}`);
});
