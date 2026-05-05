# Notes for Claude

> Read **CONTEXT.md** first for the user / engine metaphor / tone. This file
> is about *aesthetic* and *output quality*. Both files matter.

---

## On generic AI output

Claude tends to converge toward generic, "on distribution" choices — what
people call "AI slop": the same fonts, the same purple gradients on white,
the same predictable component patterns, the same Inter/Space-Grotesk type
combos. **Avoid this aggressively.** This app is a personal gift. It must
feel hand-made and specific, not assembled from a templates library.

When you reach for a default, stop and pick something else.

---

## Typography

- Don't use **Inter, Roboto, Arial, system-ui**. They're the giveaway of
  uninspired output.
- This app uses **Caprasimo** (chunky display serif), **Caveat** (handwritten),
  **Nunito** (body). All three have personality. Don't replace them with
  "safer" picks.
- When you reach for a new font, pick something distinctive — Fraunces,
  Mona Sans, Recoleta, Söhne, Authentic Sans, EB Garamond, Bricolage Grotesque,
  iA Writer Quattro. **Don't pick Space Grotesk** — it's the new Helvetica.

## Color & theme

- Dominant colors with sharp accents > timid, evenly-distributed palettes.
- Light mode: warm cream + frog green hero + cape coral accent + sakura whisper.
- Dark mode: argaman crimson (red, not purple), with frog green as the
  complementary accent. **Never** make dark mode look like generic
  `#181820` neutral grey.
- All colors live in CSS variables (`--frog`, `--coral`, `--gold`, `--sakura`,
  `--paper`, etc.). Use them. Never hardcode hex values in component styles
  unless you're inside a `@keyframes` color stop.
- Glows and halos must match their element's color. Don't put green halos on
  red elements.

## Motion

- Use animations for high-impact moments — page load with staggered reveals
  (animation-delay), the start ceremony, plan check-off, streak number pop —
  not for scattered always-on micro-interactions.
- One well-orchestrated load animation > ten constant micro-animations.
- **Trigger animations via class, not `:active`** — `:active` truncates on
  short taps, leaving animations broken.
- **No looping animations on idle elements.** Floating motes, perpetual
  gradient shimmers, etc. all kill performance on older hardware.
- For a state transition (start ↔ stop timer), gate the visual swap on a
  ceremony signal that lags behind the actual state change so the
  animation completes in place before the DOM swaps.

## Backgrounds

- Layer CSS gradients for atmosphere and depth — radial blobs in corners,
  subtle textures, never flat solid colors.
- **Static** SVG noise/patterns over animated gradient backgrounds. Animated
  `background-position` on multi-stop gradients = full viewport repaint
  every frame = dead old PCs.
- The bigger the painted area, the more cautious you must be with
  animations on it.

## What NOT to do

- Don't reach for the obvious. Sakura pink + autumn red on the same
  outfit is more interesting than two complementary muted neutrals.
- Don't sand off the rough edges. Wonky borders, rotated chips, mismatched
  patterns — these signal hand-made.
- Don't use emoji as UI controls (no ⬜/✅ "checkboxes"). Build real components.
- Don't use Material 3 / Tailwind UI / shadcn defaults wholesale. They're
  recognizable and boring.

## Performance budget

This app runs on older hardware (Adely's PC was hitting 25% CPU on basic
animations at one point). Treat CPU as scarce:

- Avoid `background-position` animation on multi-stop gradients
- Avoid `box-shadow` animation on large elements
- Prefer `transform` and `opacity` for animation
- Static backgrounds + transform animations on small elements
- One `infinite` animation total, max — and only if it's tiny

## When you're tempted to converge

If the obvious choice is Space Grotesk, pick anything else.
If the obvious choice is `#6366F1` indigo, pick anything else.
If the obvious choice is centered hero with a single CTA, restructure.

This is a personal gift. Make a choice that surprises and delights.
