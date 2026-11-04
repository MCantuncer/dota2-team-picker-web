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

1. **Calm and serious (direction C, "Codex").** A warm near black page, hairlines and space instead of boxes, one
   dimmed hero render per page, real hero, item and ability art. No all-caps text (capitalisation rule under Writing) and no
   wide letter spacing. Nothing that would fit on a League tool (tier badges, candy colours, pill chips).
2. **The portrait is the hero.** Heroes are shown by their art first. Names are the backup and are never truncated.
3. **Colour is a signal.** Radiant green means your side, Dire red the enemy, copper means focus, selected or "do
   this", amber means risk. Everything else is warm grey. No rainbow or per-item colours, no per-position colours.
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
| `bg` | Page background, flat |
| `surface` | Cards and panels, menus |
| `raised` | Fields, nested blocks, chips, hovered rows |
| `hover`, `hover-strong` | Hover fills; `hover-strong` only for secondary button hover |
| `line`, `line-strong`, `line-hover` | Card borders, control borders, hovered control borders |
| `fg` | Main text |
| `muted` | Secondary text, labels |
| `subtle` | Placeholders, meta lines. Not on `hover` (fails contrast) |
| `accent`, `accent-hover`, `accent-bright`, `accent-deep` | Copper: focus ring, primary button, the recommended answer, selected underline, links |
| `accent-tint` | Fill behind a selected or "best" item |
| `on-accent` | Text on a copper fill |
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

One family: Geist, for all text and titles (`font-sans`; `font-heading` is the same face). Titles are 600 with tight
tracking (-0.02em). Never `uppercase`, never wide tracking. All numbers use tabular figures.

| Style | Class | Use |
|---|---|---|
| Display 64/68 (48 on phones) | `text-5xl sm:text-6xl font-semibold` | Landing headline, the recommended hero name |
| Page title 40/44 | `.page-title` | One per page |
| Section title 20/24 | `.section-title` | Panel and column headings |
| Hero name 20/24 | `text-xl font-semibold` | Hero name on a suggestion, member name |
| Body 15/22 | (default) | Default text, reasons |
| Small 13/18 | `text-sm` | Meta lines, helper text, form labels |
| Label 13/16 | `.label-caps` | Field and group labels (never caps; the class name is historical) |
| Number 14/20 | `.num` | Scores, win rates, counts |
| Micro 12/16 | `.micro` | Key hints, position digits, badges, "+N" |

Nothing below 12px. No arbitrary sizes (`text-[13px]`). No `font-mono`: digits use `.num` or `.micro`. Percentages have
one decimal (`54.1%`); gaps are signed with a real minus sign (`+2.1`, `−3.4`).

## Spacing, radius, elevation

- **Spacing** on a 4px base: 4 between portraits, 8 between controls and chips, 12 dense card padding, 16 default card
  padding and phone gutter, 24 between page sections and the gutter from 640px, 32 page top padding, 48 page bottom.
  Rows are `px-4 py-3`. Use `gap` on flex and grid, not margins between siblings.
- **Radius**: `rounded-xs` (2) portraits and pips, `rounded-sm` (4) chips, badges, notices, `rounded-md` (6) buttons
  and fields, `rounded-lg` (8) cards and menus, `rounded-full` avatars and status dots only. Bare `rounded` is not
  used. Chips are never pills.
- **Elevation**: page, then `.card` (one level, never a card inside a card), then `raised` blocks inside a card, then
  menus and toasts on `surface` with a `line-strong` border and a shadow. A selected item gets a copper underline or
  edge, not a shadow. Prefer hairline rows (`border-t border-line`) over cards.

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
| `.card` | A quiet panel: hairline border, flat fill. Use only where rows and space are not enough |
| `.section-title`, `.page-title`, `.label-caps`, `.num`, `.micro` | Type styles above |
| `.kbd` | Key hint (`Enter`, `Tab`, `Esc`). Show the key next to every keyboard action |
| `.chip`, `.chip-accent` | Small label ("Pos 5"), and the copper version ("Best", "Captain") |
| `.seg` + `.seg-item` | Segmented control; mark the chosen item `aria-selected` or `aria-pressed` |
| `.seg-sm` | Compact segmented control for one row (an ally's position). Its items are radios: the chosen one (`aria-checked`) is copper filled, a guessed, unconfirmed one gets `data-guess`: dashed, not filled |
| `.notice` + `.notice-error`, `-warn`, `-done` | Page or panel message; edge colour and icon carry the meaning |
| `.link` | Copper text link |
| `.lane-check` | Lane Mark, our on/off checkbox (`<input type="checkbox" className="lane-check">` inside its `<label>`): a tile with the mid lane that lights copper with the logo dot when on. For settings that apply at once, never for a list of choices |

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
- **Why rows** (Per Player cards): one raised row per reason. It leads with the 40x22 portraits of the heroes it names
  (up to three, overlapping, then a +N badge), or a 40x22 `hover` tile with the score part's icon in `radiant` (`warn` for Watch Out), then the part
  in `.micro`, the line, and its points in `.num` on the right.
- **Position icons** (`PositionIcon`): Dota's role symbols on a solid tile, the symbol cut out. Sword Safe Lane (1),
  bow Mid Lane (2), shield with lightning Off Lane (3), hand with a flame Soft Support (4), hand with a cross Hard
  Support (5). The tile takes the text colour: copper when selected, `subtle` otherwise. Always next to the position name.
- **Focus** is a 2px copper ring with 2px offset on everything interactive (set globally; don't remove it).
- **Empty states** sit inside their panel: one line in `text-muted` saying what fills it, plus one action.
- **Loading** for remote data uses skeletons in the real shape. No spinners on the pick path.

## Motion and light

Motion confirms something the player just did; it is never decoration. Hover brightens a border or fill instead of
moving the element, and team colour arrives as a thin bar or a 12% tint.

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | Hover and press; each item of a stagger |
| `--dur-base` | 180ms | Small entrances: a hero entering a slot, a menu, a toast |
| `--dur-slow` | 240ms | Larger changes: the win bar, a panel |
| `--motion-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Entrances and state changes |
| `--motion-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits (faster than the entrance) |

The easings are not called `--ease-*` on purpose: Tailwind owns those names for its `ease-*` utilities.

| Class | What |
|---|---|
| `.enter` | Fades in and rises 4px over `--dur-base`. For one thing that just arrived |
| `.enter-stagger` | The same over `--dur-fast`, delayed by `--i` x 20ms (capped at 5 steps). Set `--i` to the item's index among the *newly added* items only: `style={{ "--i": n } as React.CSSProperties}`. Worst case 220ms |
| `.live-dot` | A 6px dot in `currentColor` with a slow breathing ring. Only for a live connection. Mark it `aria-hidden`; the text next to it carries the meaning |
| `.btn` press | Every button darkens slightly while pressed and settles 1px down |

Rules:

- Only `opacity` and `transform` move. Never animate width, height or position on the pick path. Nothing runs longer
  than 300ms; exits are faster than entrances.
- Every animation and every movement sits inside `@media (prefers-reduced-motion: no-preference)` in `globals.css`.
  With reduced motion on, nothing moves or fades: content simply appears. Never add a component-level animation
  outside that query.
- Content is never hidden by a base style: the starting point of an entrance exists only in its keyframes
  (`animation-fill-mode: backwards`), so if the animation does not run, the content is there.
- Never animate: the hero search listbox (it changes on every keystroke), team panels, the header, text being read,
  or anything on the first paint of a working screen except the suggestion list. The live dot is the only loop.
- Elements that are not clickable get no hover effect.
- The e2e accessibility check runs with reduced motion, so contrast is never measured halfway through a fade.

## Writing

Plain, short, from the player's side: "Banned", not "Mark as unavailable". Buttons say what happens ("Send Invite").

**Capitalisation.** Nav items, tabs, page and section titles, headings and buttons use Title Case: capitalise every
word except small words (a, an, the, and, or, of, to, on, for, at, by, vs, with, from) unless they come first:
"Game Story", "Item Build", "Skills and Talents", "My Heroes", "Sign In with Steam". Body text, reasons, helper lines,
tooltips and field labels are normal sentences. Never all caps.
Errors say what went wrong and how to fix it. No em dashes in UI copy.

## Checklist for UI work

- [ ] Only tokens and shared classes; no raw hex, palette colours, arbitrary sizes, `font-mono` or bare `rounded`.
- [ ] Title Case for nav, tabs, titles, headings and buttons; sentences for body text; no `uppercase` or wide tracking.
- [ ] Heroes shown with their art; names never truncated.
- [ ] Colour only for signals (team, focus, risk, error).
- [ ] Every action works by keyboard, has a visible key hint where it matters, and has an accessible name.
- [ ] Checked at 1280px, 1920px and phone width.
- [ ] Motion uses the tokens and classes above, confirms an action, and is off with reduced motion.
- [ ] New token or class? Added to `globals.css`, this page and the Design System artifact.
