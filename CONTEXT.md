# Streakling — Project Context

> Read this before touching anything. This is a gift. The details matter.
> Also read **CLAUDE.md** for the design philosophy and what to avoid.

---

## What this is

**Streakling** — a personal learning streak tracker, built by **Argaman** as a gift for his partner **Adely**. It runs on a Raspberry Pi at home, used daily across her phone, tablet, and PC. The app is small, personal, and intentional — not a generic productivity tool.

(Old name was "Frog Streak" — the new name is more learning-oriented.)

Argaman is actively working on the code himself. Keep things simple, readable, and easy to edit. Avoid unnecessary abstraction or chatty comments.

---

## The people

### Adely — the user

She's fun, cute, wholesome, has a big personality. She's also genuinely strict with herself about learning and gets frustrated when she falls short of her own standards. The app should support her without being saccharine.

What works for her:
- Dry humor, light teasing, jokingly insistent nudges ("cmon cmon, I know you're there", "nah u can do it 💪", "don't make me beg 😤")
- Small honest acknowledgment of effort
- Practical framing — "five minutes. just five." beats "you've got this!"

What doesn't:
- Generic affirmations ("you're amazing!", "believe in yourself!")
- Being told she's enough or doing great when she's not
- Anything that sounds like it came from a productivity-app template
- Jokes about her body, her appearance, or anything gendered. She's a person who studies. The mascot is a frog. Keep it about that.

She likes frogs. She uses ✨ and 😊 naturally. She writes Hebrew sometimes but the UI is English-only.

**Her aesthetic**: she pairs sakura pants with autumn leaves shirts, wears dragon earrings with funny tees. She's bold and themeful with color and pattern, and shames us for wearing basic elegant stuff. The app should feel that way too — colorful, mismatched-on-purpose, fun. NOT a polished work-app aesthetic.

### Argaman — the developer (and mascot)

Her partner. He built the app. He's also the mascot — Adely drew him as a frog. **Just a frog**, not a frog king. He has a crown and a cape in the drawing because she likes royal energy in the sketch, but he doesn't refer to himself as a king or assert royal authority in the lines.

There's a private inside joke: **"כפכף צדק"** (justice flip flop) — a 🩴 emoji is hidden in the mascot's lines as an easter egg. Don't remove it.

---

## The core concept: the engine

This is the most important idea in the app. It must inform every feature, every piece of copy, every visual metaphor.

**The frame:**
Adely has a learning problem — not a knowledge problem, not a motivation problem in the simple sense. Her internal engine for self-directed study is weak right now. It doesn't generate enough force for her to push herself, consistently. That's not a character flaw — it's just where the engine is now.

The whole point of the app — and of Argaman building it — is to help her build that engine, one learning day at a time. More consistent days = stronger engine. Stronger engine = she can eventually drive forward on her own, under her own power, without needing external push.

**How this shows up:**
- The streak is framed as engine progress, not just a number
- The home screen has a horizontal engine bar with a 🚗 that drives faster as the streak grows
- Engine states: `engine off` → `warming up…` → `engine ON 🔥` → `CRUISING 🔥🔥` → `FULL POWER ⚡🔥` (gets visually bigger and more dramatic at higher tiers)
- Bar fills completely at **14 days** of total learning. Two solid weeks is genuinely impressive — not months.
- Skip-day copy refers to "engine resting" / "not learning today", not "rest day" or "day off"
- Wins should feel rewarding — labels at higher tiers pulse and glow

**What to avoid:**
- Don't reframe this as "habit building" or "productivity tracking"
- Don't add gamification (badges, points, achievements) beyond the engine bar
- Don't make missing a day feel like failure — the engine sputters sometimes

---

## Tone

**Personality:** Warm but not saccharine. Playful but not childish. A little dry. Like a good friend who believes in you but doesn't fuss over you.

**Mascot voice:** Chatty, lightly insistent, occasionally cheeky. Examples of the right register:
> "cmon cmon i know you're there" · "nah u can do it 💪" · "the engine wants ON 🔥" · "five minutes. just five." · "even a little counts" · "don't make me beg 😤" · "you literally can" · "go go go go go 🚗" · "dust off the brain"

What to avoid in mascot lines:
- Generic inspiration ("you're amazing", "great job", "keep it up!")
- Anything personal about her body or appearance
- Hearts and "you got this!" energy

---

## Visual identity

The palette is sampled from Adely's drawing:
- **Frog body green** (`#60D890`) — primary action color
- **Cape coral/red** (`#EF5066`) — primary accent in dark mode, secondary in light mode
- **Crown gold** (`#F2C24B`) — used sparingly for special moments
- **Cream warm** (`#FFF8F0`) — light mode background

**Light mode** feels like a sunny window — cream + frog green.

**Dark mode** is **argaman crimson** (ארגמן — the dye his name comes from). Deep crimson-purple base with frog green accents. Red and green are direct complements; the green accents sing against the crimson.

> Important: dark mode is **not green-forest** and **not purple-grey**. It's argaman — a saturated red-purple-crimson tone. If you find yourself making the dark theme look like generic dark mode #181820, you've drifted. Push it back toward `#1A0A14`-ish base with crimson glow.

**Design feel:**
- Action buttons (start, save, add) are slightly blobby with a "physical key" shadow on the bottom — they feel like something to press
- The big start button does an "ignition" animation on press: scales down briefly, scales back up with an outward green ring burst, then sits with a soft afterglow for ~1.6s. The stop button has a smaller calmer animation. Both animations are triggered via a `.pressed` class added on click — NOT via `:active` — so they always play to completion regardless of how briefly the user pressed.
- The timer card itself escalates with elapsed time. Tier 1 (0–10 min) is a soft green warmup; tier 2 (10–25 min) shifts gold; tier 3 (25–45 min) gold-coral; tier 4 (45+ min) is a full animated rainbow gradient with a pulsing gradient-text elapsed time. There's also a small encouraging tier message ("engine warming 🔥" → "you're in it now ✨" → "absolutely cooking 🌶️" → "don't you dare stop 🏎️💨"). The longer she goes, the more the card pushes her not to stop.
- Navigation, mode toggles, and small controls are plain pills — calm
- Cards use a subtle diagonal gradient between `--paper` and `--paper-raised`
- A field of green/coral/gold floating motes drifts slowly upward across the whole page — visible but not loud. Like quiet fireflies.
- One-shot bouncy animations on press (~0.5–0.85s); no looping animations on idle elements (except tier 4 timer card and the motes)
- The streak number pops in with a scale animation; "X in a row" wiggles in with a slight rotation
- Plan checkboxes pop and ring out a green halo when checked
- Chips tilt slightly on hover
- Mascot peeks from behind the streak card and says a different line each visit. The mascot wrapper uses `will-change: transform` and `isolation: isolate` on the parent so iOS Safari doesn't lose track of stacking after the transition.
- When a modal opens, the bottom nav and theme button slide off-screen so the dialog has room and chrome doesn't float over content

**What it should NOT feel like:**
- A corporate productivity app (no cold blues, no "complete your goals!")
- A Duolingo-style streak punisher
- Over-designed or try-hard
- Generic dark mode

---

## Architecture (what to know before changing data flow)

**One store** (`store.service.ts`) holds three signals: `sessions`, `plans`, `restDays`. Plus a status signal for the badge.

**Sync model:**
- Mutations write to localStorage immediately
- 1.8s debounce, then push **only the changed collection(s)** — never the whole state
- Failed pushes mark the collection dirty again for retry
- Mutations that arrive during a network call schedule another push when it finishes — nothing is dropped
- Every 30s a background tick: if dirty, push; if clean, ask `GET /api/version` (a few bytes) and only fetch full state if the server is ahead
- All this means: rapid clicks coalesce into one save with the latest state. No lost data. No wasted bandwidth.

**Backend** is one ~80-line Express file. Three PUT endpoints (one per collection), one full-state GET, one version GET, one health check. Atomic write (write to .tmp, rename) so a crash mid-save can't corrupt data.

**This works.** Don't replace it with a queue / merge-CRDT / per-item-PUT system unless you genuinely need to.

---

## Data model

```ts
interface Session { id; date; startTime?; endTime?; durationMinutes; notes?; }
interface Plan    { id; date; text; orderIndex?; checkedDate?; }
restDays: string[]   // ['YYYY-MM-DD', ...]
```

Plan check state is stored as `checkedDate` on the plan itself. Auto-resets the next day because `checkedDate !== today` reads as unchecked. Syncs to backend like any plan change — survives across devices.

---

## Streak rules

- Day with a session → counts, extends the streak
- Day marked "not learning today" → doesn't count, doesn't break
- Day with no plan and no session → doesn't break (she's free to skip silently)
- Day with a plan but no session and no skip mark → **breaks the streak**
- Today is always "in progress" — streak evaluates at the day boundary

---

## Strings to know

Everything user-facing lives in `T` in `frontend/src/app/services/strings.ts`. The key editable thing is `T.mascotLines` — what Argaman says. Add/remove freely. One is picked randomly each visit.

The engine label text lives in `engine.component.ts`'s `label` getter (not in strings.ts) because it's one place and tightly tied to the visual states.

---

## Always preserve

- The engine metaphor (frame everything streak-related through it)
- The mascot's voice — dry, warm, lightly insistent, not flattery
- Frog green as primary, coral as accent
- Argaman crimson dark mode (not forest, not grey, not purple-leaning)
- Blobby buttons on **main actions only**; nav and small controls stay plain pill
- localStorage-first, then server
- One-shot animations on press, fired via class (not `:active`) so they always complete
- The 🩴 easter egg in mascot lines
- "not learning today" wording (not "rest day", not "day off")
- Real form controls (no emoji checkboxes, no emoji icons substituting for UI)
- iOS-friendly: 16px font on date/time/number inputs to prevent zoom; `-webkit-appearance: none` on those inputs

## Don't add

- Push notifications / reminders
- Social features
- Badges / points / achievements
- Generic productivity copy ("crush your goals!")
- Anything that makes a missed day feel like failure
- Gendered jokes or comments about her appearance
