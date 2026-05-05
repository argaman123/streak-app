// Streakling backend. One JSON file, three collection endpoints.
//
// Each collection (sessions / plans / restDays) has its own PUT endpoint so
// we only send what actually changed. The client is still the source of
// truth — we just store whatever it sends for a collection. No merging.
//
// Endpoints:
//   GET /api/state              -> { sessions, plans, restDays, version }
//   PUT /api/sessions           -> replaces sessions array, bumps version
//   PUT /api/plans              -> replaces plans array, bumps version
//   PUT /api/rest-days          -> replaces restDays array, bumps version
//   GET /api/health             -> { ok: true }

const fs      = require('fs');
const path    = require('path');
const express = require('express');
const cors    = require('cors');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const PORT      = process.env.PORT || 3333;

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function read() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { sessions: [], plans: [], restDays: [], version: 0 };
    const p = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return {
      sessions: p.sessions || [],
      plans:    p.plans    || [],
      restDays: p.restDays || [],
      version:  p.version  || 0
    };
  } catch (e) {
    console.error('read failed:', e.message);
    return { sessions: [], plans: [], restDays: [], version: 0 };
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

// Version-only check — called every 30s. Returns just the current version number.
// The client only fetches full state if this version is higher than what it has.
// Cheap to call; no data transferred when nothing changed.
app.get('/api/version', (req, res) => {
  const s = read();
  res.json({ version: s.version });
});

// Full state read (initial load + when version check says we're behind)
app.get('/api/state', (req, res) => res.json(read()));

// Replace just sessions
app.put('/api/sessions', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected array' });
  const s = read();
  s.sessions = req.body;
  s.version++;
  write(s);
  res.json({ version: s.version });
});

// Replace just plans
app.put('/api/plans', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected array' });
  const s = read();
  s.plans = req.body;
  s.version++;
  write(s);
  res.json({ version: s.version });
});

// Replace just rest days
app.put('/api/rest-days', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected array' });
  const s = read();
  s.restDays = req.body;
  s.version++;
  write(s);
  res.json({ version: s.version });
});

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
  console.log(`🐸 running on :${PORT}  data: ${DATA_FILE}`);
});
