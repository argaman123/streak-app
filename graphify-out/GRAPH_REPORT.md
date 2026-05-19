# Graph Report - .  (2026-05-19)

## Corpus Check
- Corpus is ~36,499 words - fits in a single context window. You may not need a graph.

## Summary
- 391 nodes · 592 edges · 31 communities (18 shown, 13 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.88)
- Token cost: 182,719 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Shell & Pages|Frontend Shell & Pages]]
- [[_COMMUNITY_Streak Engine & Ceremony|Streak Engine & Ceremony]]
- [[_COMMUNITY_Calendar Component|Calendar Component]]
- [[_COMMUNITY_Progress Chart Internals|Progress Chart Internals]]
- [[_COMMUNITY_Page Templates|Page Templates]]
- [[_COMMUNITY_Drag-and-Drop Directives|Drag-and-Drop Directives]]
- [[_COMMUNITY_Backend Database|Backend Database]]
- [[_COMMUNITY_Home Page Methods|Home Page Methods]]
- [[_COMMUNITY_Sync Store Service|Sync Store Service]]
- [[_COMMUNITY_History Page Methods|History Page Methods]]
- [[_COMMUNITY_Argaman Brand Aesthetic|Argaman Brand Aesthetic]]
- [[_COMMUNITY_DB Row Mapping & Versioning|DB Row Mapping & Versioning]]
- [[_COMMUNITY_Mascot Lifecycle|Mascot Lifecycle]]
- [[_COMMUNITY_Planner Page Methods|Planner Page Methods]]
- [[_COMMUNITY_Project Docs & Engine Metaphor|Project Docs & Engine Metaphor]]
- [[_COMMUNITY_Frog Illustration Tokens|Frog Illustration Tokens]]
- [[_COMMUNITY_App Routing & Config|App Routing & Config]]
- [[_COMMUNITY_Timer Service|Timer Service]]
- [[_COMMUNITY_Engine Progress Bar|Engine Progress Bar]]
- [[_COMMUNITY_Planner + Calendar Wiring|Planner + Calendar Wiring]]
- [[_COMMUNITY_Icon Design (192px)|Icon Design (192px)]]
- [[_COMMUNITY_Icon Design (512px Crowned)|Icon Design (512px Crowned)]]
- [[_COMMUNITY_Mascot Brand Image|Mascot Brand Image]]
- [[_COMMUNITY_index.html PWA Setup|index.html PWA Setup]]
- [[_COMMUNITY_Settings Service Stub|Settings Service Stub]]
- [[_COMMUNITY_Sync Status Indicator|Sync Status Indicator]]
- [[_COMMUNITY_Angular Bootstrap Entry|Angular Bootstrap Entry]]
- [[_COMMUNITY_Session Data Model|Session Data Model]]
- [[_COMMUNITY_API Base Config|API Base Config]]
- [[_COMMUNITY_UI State Service|UI State Service]]
- [[_COMMUNITY_SPA Fallback Handler|SPA Fallback Handler]]

## God Nodes (most connected - your core abstractions)
1. `HomeComponent` - 22 edges
2. `StoreService` - 20 edges
3. `HistoryComponent` - 12 edges
4. `MascotComponent` - 11 edges
5. `toIsoDate()` - 11 edges
6. `todayIso()` - 11 edges
7. `CalendarComponent` - 10 edges
8. `parseIsoDate()` - 10 edges
9. `PlansService` - 10 edges
10. `T` - 10 edges

## Surprising Connections (you probably didn't know these)
- `TimerService - Running Session Timer` --conceptually_related_to--> `Timer Start/Stop Ceremony Animation`  [INFERRED]
  frontend/src/app/services/timer.service.ts → CONTEXT.md
- `Engine Metaphor - Learning Momentum as Car Engine` --rationale_for--> `CONTEXT.md Project Context`  [EXTRACTED]
  frontend/src/app/components/engine/engine.component.ts → CONTEXT.md
- `Status badge (saving/loading/local/idle)` --shares_data_with--> `StoreService`  [INFERRED]
  frontend/src/app/app.component.html → frontend/src/app/services/store.service.ts
- `Maskable PWA App Icon` --semantically_similar_to--> `PWA Icon 192px`  [INFERRED] [semantically similar]
  frontend/public/icons/icon-maskable.png → frontend/public/icons/icon-192.png
- `Maskable PWA App Icon` --semantically_similar_to--> `PWA Icon 512px`  [INFERRED] [semantically similar]
  frontend/public/icons/icon-maskable.png → frontend/public/icons/icon-512.png

## Hyperedges (group relationships)
- **PlannerComponent, CalendarComponent, and DragListDirective/DragItemDirective collectively implement the drag-to-reorder date-bound plan management UI** — planner_component, calendar_component, dragdrop_directive_list, dragdrop_directive_item [EXTRACTED 1.00]
- **Batch sync round-trip (client ops to server to meta version)** — server_api_batch, db_prepared_statements, db_getUpdatedAt, concept_updatedat_meta [INFERRED 0.85]
- **Streak calculation inputs (sessions + plans + rest days)** — home_streak, dateutils_calculateStreak, plansservice_PlansService, restdaysservice_RestDaysService [EXTRACTED 1.00]
- **Progress chart pixel pipeline (rollup to points to bezier path)** — progresschart_days, progresschart_linePoints, progresschart_smoothPath [EXTRACTED 1.00]
- **Offline-first sync pipeline (debounce + compact + batch + diff)** — store_service_StoreService, store_service_compact, store_service_diffToOps, store_service_Op, store_service_debounce_batch_sync [EXTRACTED 0.95]
- **Home 'today' hero composition (streak + engine + mascot + timer)** — home_component_html, engine_component_html, mascot_component_html, session_form_component_html [EXTRACTED 0.95]
- **Centralized copy layer used across pages** — strings_T, home_component_html, planner_component_html, history_component_html, calendar_component_html, session_form_component_html [EXTRACTED 0.95]

## Communities (31 total, 13 thin omitted)

### Community 0 - "Frontend Shell & Pages"
Cohesion: 0.09
Nodes (16): DayGroup, min, ModalComponent, Session, RestDaysService, newId(), SessionsService, compact() (+8 more)

### Community 1 - "Streak Engine & Ceremony"
Cohesion: 0.08
Nodes (36): AppComponent (root shell), AppComponent.onBeforeUnload (flush on unload), appConfig (router + http + service worker), Ceremony gating (visual swap lags state change), Rest day semantics (no break, no extend, allow learning), calculateStreak (rest-day-aware streak engine), formatDuration, formatElapsed (timer-safe, no seconds) (+28 more)

### Community 2 - "Calendar Component"
Cohesion: 0.11
Nodes (17): a, CalDay, CalendarComponent, days, first, last, opts, calculateStreak() (+9 more)

### Community 3 - "Progress Chart Internals"
Cohesion: 0.07
Nodes (20): baseY, cursor, data, DayData, iso, keys, line, LinePoint (+12 more)

### Community 4 - "Page Templates"
Cohesion: 0.1
Nodes (28): Fixed inset:0 nav anchor (iOS PWA fix), AppComponent template (shell + nav), Status badge (saving/loading/local/idle), Calendar template (week/month grid), Engine template (progress car track), History page template (grouped sessions), Home page template (today / streak / timer), Skip-day alternate hero (+20 more)

### Community 5 - "Drag-and-Drop Directives"
Cohesion: 0.11
Nodes (9): DragItemDirective, DragListDirective, Plan, byId, canonical, override, prettyDate(), newId() (+1 more)

### Community 6 - "Backend Database"
Cohesion: 0.12
Nodes (21): Database, db, fs, getUpdatedAt(), path, planFromRow(), q, sessionFromRow() (+13 more)

### Community 8 - "Sync Store Service"
Cohesion: 0.21
Nodes (3): diffToOps(), Status, StoreService

### Community 10 - "Argaman Brand Aesthetic"
Cohesion: 0.21
Nodes (12): Argaman Brand Identity, Argaman Crimson Color Token, Dark Background Color (deep forest green), Frog Green Color Token, Hand-Made Personal Gift Aesthetic, Caveat Handwritten Font Style, PWA Icon 192px, PWA Icon 512px (+4 more)

### Community 11 - "DB Row Mapping & Versioning"
Cohesion: 0.26
Nodes (12): camelCase/snake_case boundary (DB rows to API shape), updatedAt meta versioning (per-collection timestamps), getUpdatedAt (meta key reader), planFromRow (snake_case to camelCase), Prepared Statement Registry (q), sessionFromRow (snake_case to camelCase), SQLite Schema (sessions/plans/rest_days/meta), migrate() data.json to data.db (+4 more)

### Community 14 - "Project Docs & Engine Metaphor"
Cohesion: 0.22
Nodes (8): CLAUDE.md Design Guidelines, CONTEXT.md Project Context, EngineComponent - Learning Momentum Bar, Engine Metaphor - Learning Momentum as Car Engine, EngineState Type (stalled/warming/running/cruising/full-power), Streak Rules (session/skip/break logic), Timer Start/Stop Ceremony Animation, TimerService - Running Session Timer

### Community 15 - "Frog Illustration Tokens"
Cohesion: 0.27
Nodes (10): Design Token: Cream/Paper (#FAF7EE / --paper), Design Token: Frog Green (#7BB661 / --frog), Design Token: Sakura Pink (#F4A2B5 / --sakura), Rounded Square Background (cream #FAF7EE), Frog Belly Ellipse (cream #F4E9C9), Frog Cheek Blush (sakura pink #F4A2B5), Frog Body Ellipse (frog green #7BB661), Frog Eyes (whites, pupils, shine) (+2 more)

### Community 16 - "App Routing & Config"
Cohesion: 0.28
Nodes (3): AppComponent, appConfig, routes

### Community 19 - "Planner + Calendar Wiring"
Cohesion: 0.4
Nodes (6): Application Routes, CalendarComponent - Date Picker, DragItemDirective, DragListDirective, Plan Interface (id, date, text, orderIndex, checkedDate), PlannerComponent - Plans & Calendar Page

### Community 20 - "Icon Design (192px)"
Cohesion: 0.47
Nodes (6): App Icon 192px, App Name Text: Argaman, Icon Color Palette: Frog Green, Coral Red, Dark Background, Frog Mascot Character, Hand-Drawn Illustration Style, PWA Icon 192px (Web App Manifest)

### Community 21 - "Icon Design (512px Crowned)"
Cohesion: 0.6
Nodes (6): App Icon 512px - Crowned Frog Mascot, Argaman Branding / Title Text, Royal Cape and Crown Accessories, Dark Green Background Theme, Frog Mascot Character, Hand-Drawn Illustration Style

### Community 22 - "Mascot Brand Image"
Cohesion: 0.7
Nodes (5): App Mascot / Brand Identity, Frog Green and Coral/Red Color Scheme, Frog Character (Green, Crown, Cape), Hand-Drawn Illustration Style, Argaman Frog Mascot Image

### Community 23 - "index.html PWA Setup"
Cohesion: 0.67
Nodes (3): Caprasimo / Caveat / Nunito font load, iOS PWA status-bar 'default' workaround, index.html (Streakling shell)

## Knowledge Gaps
- **99 isolated node(s):** `fs`, `path`, `Database`, `fs`, `path` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HomeComponent` connect `Home Page Methods` to `Frontend Shell & Pages`, `Calendar Component`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `StoreService` connect `Sync Store Service` to `Frontend Shell & Pages`, `Drag-and-Drop Directives`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `HistoryComponent` connect `History Page Methods` to `Frontend Shell & Pages`, `Calendar Component`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `Database` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Shell & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Streak Engine & Ceremony` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Calendar Component` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._