# Graph Report - .  (2026-05-11)

## Corpus Check
- Corpus is ~34,104 words - fits in a single context window. You may not need a graph.

## Summary
- 312 nodes · 536 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Calendar Component Logic|Calendar Component Logic]]
- [[_COMMUNITY_App Bootstrap & Date Utilities|App Bootstrap & Date Utilities]]
- [[_COMMUNITY_App Shell & Navigation|App Shell & Navigation]]
- [[_COMMUNITY_Drag & Drop Reordering|Drag & Drop Reordering]]
- [[_COMMUNITY_Rest Days & Progress Chart|Rest Days & Progress Chart]]
- [[_COMMUNITY_Data Models & Storage|Data Models & Storage]]
- [[_COMMUNITY_Project Docs & Templates|Project Docs & Templates]]
- [[_COMMUNITY_Home Page Interactions|Home Page Interactions]]
- [[_COMMUNITY_Offline Store & Sync|Offline Store & Sync]]
- [[_COMMUNITY_Brand Identity & Design Tokens|Brand Identity & Design Tokens]]
- [[_COMMUNITY_Express Backend API|Express Backend API]]
- [[_COMMUNITY_Session History Page|Session History Page]]
- [[_COMMUNITY_SVG Color Design System|SVG Color Design System]]
- [[_COMMUNITY_Timer Service|Timer Service]]
- [[_COMMUNITY_Engine Meter Component|Engine Meter Component]]
- [[_COMMUNITY_Sessions CRUD Service|Sessions CRUD Service]]
- [[_COMMUNITY_Backend Data Persistence|Backend Data Persistence]]
- [[_COMMUNITY_PWA Icon 192px|PWA Icon 192px]]
- [[_COMMUNITY_PWA Icon 512px|PWA Icon 512px]]
- [[_COMMUNITY_Mascot & Brand Assets|Mascot & Brand Assets]]
- [[_COMMUNITY_API Config|API Config]]

## God Nodes (most connected - your core abstractions)
1. `StoreService` - 17 edges
2. `HomeComponent` - 16 edges
3. `HomeComponent - Main Dashboard Page` - 15 edges
4. `HistoryComponent` - 11 edges
5. `toIsoDate()` - 11 edges
6. `todayIso()` - 11 edges
7. `StoreService - Reactive State Store` - 11 edges
8. `CalendarComponent` - 10 edges
9. `PlansService` - 10 edges
10. `T` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Express Backend Server` --semantically_similar_to--> `StoreService - Reactive State Store`  [INFERRED] [semantically similar]
  backend/server.js → frontend/src/app/services/store.service.ts
- `TimerService - Running Session Timer` --conceptually_related_to--> `Timer Start/Stop Ceremony Animation`  [INFERRED]
  frontend/src/app/services/timer.service.ts → CONTEXT.md
- `index.html App Entry` --conceptually_related_to--> `SettingsService - Theme Toggle`  [INFERRED]
  frontend/src/index.html → frontend/src/app/services/settings.service.ts
- `Engine Metaphor - Learning Momentum as Car Engine` --rationale_for--> `CONTEXT.md Project Context`  [EXTRACTED]
  frontend/src/app/components/engine/engine.component.ts → CONTEXT.md
- `CONTEXT.md Project Context` --rationale_for--> `Mascot Lines (Argaman Frog Voice)`  [EXTRACTED]
  CONTEXT.md → frontend/src/app/services/strings.ts

## Hyperedges (group relationships)
- **StoreService + PlansService + RestDaysService form the client-side reactive state layer** — store_service, plans_service, rest_days_service, sessions_service [INFERRED 0.90]
- **calculateStreak consumes sessions, plans, restDays to produce StreakInfo displayed in HomeComponent** — date_utils_calculate_streak, streak_info_interface, home_component, sessions_service, plans_service, rest_days_service [INFERRED 0.90]
- **PlannerComponent, CalendarComponent, and DragListDirective/DragItemDirective collectively implement the drag-to-reorder date-bound plan management UI** — planner_component, calendar_component, dragdrop_directive_list, dragdrop_directive_item [EXTRACTED 1.00]
- **Offline-First Sync: LocalStorage + Debounce + Server Push** — store_service, localStorage_persistence, debounce_sync [EXTRACTED 0.95]
- **Timer Ceremony Flow: TimerService + HomeTemplate + CeremonyState** — timer_service, home_component_html, timer_ceremony [INFERRED 0.85]
- **Global UI Strings: T Constant consumed by all page/component templates** — strings_t, home_component_html, planner_component_html [EXTRACTED 0.95]

## Communities (21 total, 7 thin omitted)

### Community 0 - "Calendar Component Logic"
Cohesion: 0.09
Nodes (25): a, CalDay, CalendarComponent, days, first, last, opts, DayGroup (+17 more)

### Community 1 - "App Bootstrap & Date Utilities"
Cohesion: 0.13
Nodes (36): AppComponent - Root Shell, AppComponent Template, Angular Application Config, Application Routes, CalendarComponent - Date Picker, Date Utilities (toIsoDate, todayIso, parseIsoDate, formatDuration, calculateStreak, etc.), calculateStreak() - Streak Computation Logic, Streak Rules (rest days don't break, unplanned days neutral, missed plans break) (+28 more)

### Community 2 - "App Shell & Navigation"
Cohesion: 0.11
Nodes (7): AppComponent, appConfig, routes, ModalComponent, SettingsService, Theme, UiService

### Community 3 - "Drag & Drop Reordering"
Cohesion: 0.13
Nodes (7): DragItemDirective, DragListDirective, byId, canonical, override, PlannerComponent, set

### Community 4 - "Rest Days & Progress Chart"
Cohesion: 0.1
Nodes (14): cursor, DayData, iso, keys, line, LinePoint, max, out (+6 more)

### Community 5 - "Data Models & Storage"
Cohesion: 0.13
Nodes (8): Plan, newId(), PlansService, DirtyFlags, PersistedState, Status, UpdatedAt, ZERO_TIMES

### Community 6 - "Project Docs & Templates"
Cohesion: 0.18
Nodes (16): CalendarComponent Template, CLAUDE.md Design Guidelines, CONTEXT.md Project Context, EngineComponent Template, Engine Metaphor - Learning Momentum as Car Engine, HistoryPage Template, HomePage Template, MascotComponent Template (+8 more)

### Community 9 - "Brand Identity & Design Tokens"
Cohesion: 0.19
Nodes (13): Argaman Brand Identity, Argaman Crimson Color Token, Dark Background Color (deep forest green), Frog Green Color Token, Hand-Made Personal Gift Aesthetic, Caveat Handwritten Font Style, PWA Icon 192px, PWA Icon 512px (+5 more)

### Community 10 - "Express Backend API"
Cohesion: 0.2
Nodes (8): app, cors, emptyTimes(), express, fs, path, read(), s

### Community 12 - "SVG Color Design System"
Cohesion: 0.24
Nodes (11): Design Token: Cream/Paper (#FAF7EE / --paper), Design Token: Frog Green (#7BB661 / --frog), Design Token: Sakura Pink (#F4A2B5 / --sakura), Rounded Square Background (cream #FAF7EE), Frog Belly Ellipse (cream #F4E9C9), Frog Cheek Blush (sakura pink #F4A2B5), Frog Body Ellipse (frog green #7BB661), Frog Eyes (whites, pupils, shine) (+3 more)

### Community 16 - "Backend Data Persistence"
Cohesion: 0.33
Nodes (6): Atomic Write Pattern (tmp+rename), Express Backend Server, Per-Collection updatedAt Versioning, putCollection() - Generic PUT Handler, read() - Load State from Disk, write() - Atomic Write to Disk

### Community 17 - "PWA Icon 192px"
Cohesion: 0.47
Nodes (6): App Icon 192px, App Name Text: Argaman, Icon Color Palette: Frog Green, Coral Red, Dark Background, Frog Mascot Character, Hand-Drawn Illustration Style, PWA Icon 192px (Web App Manifest)

### Community 18 - "PWA Icon 512px"
Cohesion: 0.6
Nodes (6): App Icon 512px - Crowned Frog Mascot, Argaman Branding / Title Text, Royal Cape and Crown Accessories, Dark Green Background Theme, Frog Mascot Character, Hand-Drawn Illustration Style

### Community 19 - "Mascot & Brand Assets"
Cohesion: 0.7
Nodes (5): App Mascot / Brand Identity, Frog Green and Coral/Red Color Scheme, Frog Character (Green, Crown, Cape), Hand-Drawn Illustration Style, Argaman Frog Mascot Image

## Knowledge Gaps
- **52 isolated node(s):** `fs`, `path`, `express`, `cors`, `app` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HomeComponent` connect `Home Page Interactions` to `Calendar Component Logic`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `StoreService` connect `Offline Store & Sync` to `Calendar Component Logic`, `App Shell & Navigation`, `Rest Days & Progress Chart`, `Data Models & Storage`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `T` connect `Calendar Component Logic` to `App Shell & Navigation`, `Drag & Drop Reordering`, `Rest Days & Progress Chart`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `HomeComponent - Main Dashboard Page` (e.g. with `SessionFormComponent - Add/Edit Session Form` and `StreakInfo Interface (total, inRow)`) actually correct?**
  _`HomeComponent - Main Dashboard Page` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `express` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Calendar Component Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap & Date Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._