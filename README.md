# 🐸 Streakling

A small, personal learning streak tracker. Built as a gift. Single user, lives on a Raspberry Pi, used daily across phone, tablet, and PC.

> **Heads up for any AI assistant editing this code:** read [`CONTEXT.md`](./CONTEXT.md) first. It explains who the user is, the engine metaphor, the tone, and what to preserve. Skipping it leads to PRs that miss the point of the app.

---

## What it does

- **Today** — streak count, today's plans (with checkboxes), big start/stop timer, list of today's sessions. Argaman peeks from behind the streak card with a different line each visit.
- **Planner** — month/week calendar; drag-and-drop plans per day; mark a day as "not learning today" so it doesn't break the streak.
- **History** — bar chart for the last 7 days, line chart for all time; sessions grouped by day.
- **Engine bar** — a small horizontal progress bar with a 🚗 that drives faster as the streak grows. Full power at 14 days. The whole streak metaphor is the engine — read CONTEXT.md.
- **Offline-first** — every change writes to localStorage instantly; the backend syncs in the background. Works fine if the Pi is unreachable.
- **Light + dark mode** — light is cream + frog green; dark is argaman crimson with frog green accents. Theme toggle on the home page only.

---

## Project layout

```
streak-app/
├── README.md                  ← this file
├── CONTEXT.md                 ← user/tone/style brief — read first
├── docker-compose.yml         ← run the backend with one command
├── backend/
│   ├── Dockerfile             multi-arch (Pi arm64 + x86)
│   ├── server.js              everything — ~80 lines
│   └── package.json
└── frontend/                  Angular 18, standalone components
    └── src/app/
        ├── app.component.*    shell, bottom nav, theme toggle, status badge
        ├── models/            TS interfaces (Session, Plan)
        ├── services/
        │   ├── store.service.ts       single source of truth + sync
        │   ├── sessions.service.ts    thin facade over the store
        │   ├── plans.service.ts       facade + check toggle
        │   ├── rest-days.service.ts   facade
        │   ├── settings.service.ts    theme persistence
        │   ├── timer.service.ts       minute-resolution timer
        │   ├── date.utils.ts          duration formatting + streak math
        │   └── strings.ts             all UI text (T constant) + mascot lines
        ├── components/
        │   ├── modal/                 generic dialog
        │   ├── session-form/          add / edit a session
        │   ├── mascot/                Argaman frog peeking from behind cards
        │   ├── progress-chart/        SVG bar + line chart
        │   ├── calendar/              week/month date picker
        │   ├── dragdrop/              touch-friendly drag directive
        │   └── engine/                streak engine bar with the car
        └── pages/
            ├── home/                  streak + plans + big button + sessions
            ├── planner/               calendar + draggable plans + skip toggle
            └── history/               chart + grouped sessions
```

---

## Backend (Docker on a Pi)

```bash
cd /path/to/streak-app
docker compose up -d
```

The backend runs on port **3333** by default. Data persists in `./data/data.json` on the host (mounted volume).

Three endpoints:
- `GET /api/state` — full state for boot
- `GET /api/version` — small version-check call (used every 30s by the client)
- `PUT /api/sessions | /api/plans | /api/rest-days` — replace one collection

If something is unreachable, the client keeps working from localStorage and syncs when it's back.

### nginx proxy

```nginx
server {
    listen 443 ssl;
    server_name your.domain.tld;
    root /var/www/streakling;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:3333/api/; proxy_set_header Host $host; }
}
```

### Build the frontend

```bash
cd frontend && npm install && npm run build
# output: frontend/dist/streak-app/browser/
# copy to /var/www/streakling on the Pi
```

---

## Development

Two terminals:

```bash
npm run dev:backend     # http://localhost:3333
npm run dev:frontend    # http://localhost:4200
```

The dev frontend proxies `/api/*` to `localhost:3333` automatically.

---

## Streak rules

- A day with at least one session counts and extends the streak.
- A day marked "not learning today" doesn't count or break the streak.
- A day with no plan and no session doesn't break the streak (she's free to skip without marking anything).
- A day with a plan but no session and no skip mark — that breaks the streak.
- Today is always counted as in-progress; streak math evaluates at the day boundary.
