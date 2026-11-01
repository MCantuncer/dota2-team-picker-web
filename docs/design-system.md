# Design system

This is the site's one design system. Every screen, component and email follows it.

- **Values live in code.** Tokens and shared classes are in `src/app/globals.css`. That file is the single source of
  truth: change a value there, never in a component.
- **The browsable reference** (tokens, type, components with live previews) is the Design System artifact:
  https://claude.ai/artifact/SS5UPqgKyMUEyUr79g6t1m. It mirrors `globals.css`; when a token or class changes here,
  update the artifact in the same piece of work.
- **The full specs** behind it (audit, sizes per component, flows, the draft screen wireframe) are the designer notes
  this system was built from. This page is the short version a contributor needs.

## Principles

1. **Broadcast, not back office.** Screens read like a draft overlay: condensed caps labels, team coloured top bars,
   portraits in 16:9 frames, numbers in the display face. If a screen could be any admin panel once you blur the
   portraits, it is wrong.
2. **The portrait is the hero.** Heroes are shown by their art first. Names are the backup and are never truncated.
3. **Colour is a signal.** Radiant green means your side, Dire red the enemy, gold means focus, selected or "do this",
   amber means risk. Everything else is slate. No rainbow or per-item colours, no per-position colours.
4. **Thirty seconds, one input.** On the pick path: one focused field, Enter to commit, Tab to move, results on every
   keystroke. No modal, spinner or confirm dialog; offer Undo instead.
5. **One grid, one rhythm.** 4px base, three control heights, four radii, one type scale. Edges line up on the page
   column.
6. **Hierarchy by size, not chrome.** What matters now is the biggest and brightest thing. Secondary material steps
   down in size and to `text-muted`; it does not get another box.
7. **Respect the expert.** Short plain words ("Banned", "My team"). Never explain the game, only our own behaviour.

Not allowed: neon glow, fake metal, angled "gamer" shapes, purple gradients, emoji, Valve logos or layouts copied one
to one.

## Colour tokens

Use them as Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, `ring-accent`) or as `var(--name)` in
`globals.css`. Never write a raw hex value or a Tailwind palette colour (`zinc-800`, `red-500`) in a component.

| Token | Use |
|---|---|
| `bg` | Page background (with the Radiant and Dire corner glows on `body`) |
| `surface` | Cards and panels, menus |
| `raised` | Fields, nested blocks, chips, hovered rows |
| `hover`, `hover-strong` | Hover fills; `hover-strong` only for secondary button hover |
| `line`, `line-strong`, `line-hover` | Card borders, control borders, hovered control borders |
| `fg` | Main text |
| `muted` | Secondary text, labels |
| `subtle` | Placeholders, meta lines. Not on `hover` (fails contrast) |
| `accent`, `accent-hover`, `accent-bright`, `accent-deep` | Gold: focus ring, primary button, selected state, links |
| `accent-tint` | Fill behind a selected or "best" item |
| `on-accent` | Text on a gold fill |
| `radiant`, `radiant-strong`, `radiant-tint` | Your team: label text, bars and borders, column wash |
| `dire`, `dire-strong`, `dire-tint` | Enemy, errors: label text, bars and borders, column wash |
| `warn`, `warn-tint` | Risk only, such as "Gamble: Anti-Mage still available" |
| `danger`, `danger-hover`, `on-strong` | Solid fill for the final step of an action that can't be undone, and its text |
| `ban` | Ban slash and outline on greyed portraits. Never text |
| `attr-str`, `attr-agi`, `attr-int`, `attr-uni` | 12px attribute glyphs only, always next to the word |
| `rank-0` to `rank-7` | Rank badge ramp, Herald to Immortal |
| `steam`, `steam-hover` | The Steam sign-in button only |

`radiant-strong` and `dire-strong` are for borders and bars, never text. Never rely on red and green alone: pair them
with a label, a position or the column they sit in.

## Type

Display face: Barlow Semi Condensed (`font-heading`). Body: Geist (`font-sans`). All numbers use tabular figures.

| Style | Class | Use |
|---|---|---|
| Display 60/57 (48 on phones) | `font-heading text-5xl sm:text-6xl` | Landing headline only |
| Page title 30/33 | `.page-title` | One per page |
| Section title 16/20 caps | `.section-title` | Panel and column headings |
| Hero name 20/24 | `font-heading text-xl font-bold` | Hero name on a suggestion card, member name |
| Body 14/20 | `text-sm` | Default text, reasons, form labels |
| Small 12/16 | `text-xs` | Meta lines, helper text |
| Label 13/16 caps | `.label-caps` | Field and group labels |
| Number 14/20 | `.num` | Scores, win rates, counts |
| Micro 11/14 caps | `.micro` | Key hints, position digits, badges, "+N" |

Nothing below 11px. No arbitrary sizes (`text-[13px]`). No `font-mono`: digits use `.num` or `.micro`. Percentages have
one decimal (`54.1%`); gaps are signed with a real minus sign (`+2.1`, `−3.4`).

## Spacing, radius, elevation

- **Spacing** on a 4px base: 4 between portraits, 8 between controls and chips, 12 dense card padding, 16 default card
  padding and phone gutter, 24 between page sections and the gutter from 640px, 32 page top padding, 48 page bottom.
  Rows are `px-4 py-3`. Use `gap` on flex and grid, not margins between siblings.
- **Radius**: `rounded-xs` (2) portraits and pips, `rounded-sm` (4) chips, badges, notices, `rounded-md` (6) buttons
  and fields, `rounded-lg` (8) cards and menus, `rounded-full` avatars and status dots only. Bare `rounded` is not
  used. Chips are never pills.
- **Elevation**: page, then `.card` (one level, never a card inside a card), then `raised` blocks inside a card, then
  menus and toasts on `surface` with a `line-strong` border and a shadow. A selected item gets a gold ring, not a
  shadow.

## Shared classes

| Class | What |
|---|---|
| `page` | The page column. Header, footer and every page use it so edges line up |
| `.btn` + `.btn-primary`, `.btn-secondary`, `.btn-ghost` | Buttons. One primary per region |
| `.btn-sm`, `.btn-lg` | 32px and 44px buttons (default 36px) |
| `.btn-icon` | Square ghost button with one 16px icon; needs `aria-label` |
| `.btn-danger-quiet` | Destructive action that is not the final step ("Remove" in a menu) |
| `.btn-danger` | The final step of something that can't be undone. One on screen, small size. Prefer Undo |
| `.field`, `.field-lg` | Inputs and selects, 36px and 44px. `aria-invalid="true"` shows the error ring |
| `.card` | A panel |
| `.section-title`, `.page-title`, `.label-caps`, `.num`, `.micro` | Type styles above |
| `.kbd` | Key hint (`Enter`, `Tab`, `Esc`). Show the key next to every keyboard action |
| `.chip`, `.chip-accent` | Small label on slate ("POS 5"), and the gold version ("BEST", "CAPTAIN") |
| `.seg` + `.seg-item` | Segmented control; mark the chosen item `aria-selected` or `aria-pressed` |
| `.notice` + `.notice-error`, `-warn`, `-done` | Page or panel message; edge colour and icon carry the meaning |
| `.link` | Gold text link |

Reuse these before writing a new style. If a screen needs something new, add it here and to `globals.css` as a token
or class in its own small PR, then use it.

## Heroes, icons, states

- **Hero portraits** are 16:9 from the Steam CDN, `object-cover`, `rounded-xs`. Sizes: 40x22 search rows and chips,
  64x36 strips, 80x45 draft slots, 112x63 suggestion cards. Square icons (OpenDota `icon`) where a portrait does not
  fit. Missing art is a slate tile with the full name in `.micro`, never a coloured placeholder.
- **Picked** by your team: 3px `radiant` top bar. By the enemy: 3px `dire` top bar. **Banned**: greyscale, darkened,
  with a `ban` slash.
- **Icons**: Lucide, outline, 16px in controls, 20px in large buttons and empty states, `currentColor`. An icon takes
  a signal colour only with its meaning (warning triangle in `warn`). No emoji.
- **Focus** is a 2px gold ring with 2px offset on everything interactive (set globally; don't remove it).
- **Empty states** sit inside their panel: one line in `text-muted` saying what fills it, plus one action.
- **Loading** for remote data uses skeletons in the real shape. No spinners on the pick path.

## Writing

Plain, short, from the player's side: "Banned", not "Mark as unavailable". Buttons say what happens ("Send invite").
Errors say what went wrong and how to fix it. No em dashes in UI copy.

## Checklist for UI work

- [ ] Only tokens and shared classes; no raw hex, palette colours, arbitrary sizes, `font-mono` or bare `rounded`.
- [ ] Heroes shown with their art; names never truncated.
- [ ] Colour only for signals (team, focus, risk, error).
- [ ] Every action works by keyboard, has a visible key hint where it matters, and has an accessible name.
- [ ] Checked at 1280px, 1920px and phone width.
- [ ] New token or class? Added to `globals.css`, this page and the Design System artifact.
