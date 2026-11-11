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
| `line-control` | The outline of an empty slot (`CutOutline`) |
| `frame-edge` | The lit 1px edge of a Lane Cut frame |
| `stage` | The stage light behind a hero render (`.hero-stage`). A gradient, so `var(--stage)` only |
| `lane-line` | The Team Plan's mid lane and the ring of an open node (`.lane-spine`, `.lane-node-open`) |
| `fg` | Main text |
| `muted` | Secondary text, labels |
| `subtle` | Placeholders, meta lines. Not on `hover` (fails contrast) |
| `accent`, `accent-hover`, `accent-bright`, `accent-deep` | Copper: focus ring, primary button, the recommended answer, selected underline |
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

- **Spacing** on a 4px base. Panels and cards: 20 padding (`p-5`), 24 on big cards (`p-6`), 20 between blocks in a
  card (`gap-5`). 16 between cards (`gap-4`), 24 between page sections (`gap-6`), 10 between reason lines
  (`gap-2.5`), 8 between side by side buttons and chips (`gap-2`), 4 between portraits. A face inline in a sentence
  gets room around it (`ml-1`, `gap-2`). 16 phone gutter, 24 from 640px, 32 page top padding, 48 page bottom. Rows
  are `px-4 py-3`. Use `gap` on flex and grid, not margins between siblings.
- **Corners**: `rounded-xl` (12) panels, cards and menus, `rounded-lg` (8) buttons, fields and tiles, `rounded-md` (6)
  icons, chips and badges, `rounded-xs` (2) 16:9 portraits and pips. `.card`, `.btn`, `.field`, `.seg` and `.chip`
  already have them. `rounded-full` only for avatars, status dots and the green You pill. Hero frames use the Lane
  Cut instead. Bare `rounded` is not used. Chips are never pills.
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
| `.row-link` | Makes a whole row or card one click target: on the row's main link (the name); the row is `relative`, buttons inside it add `relative z-10`. See Links below |
| `.stack-banner` + `.stack-render` | A Stack's head: surface with faint Radiant and Dire corners and a hairline split, and one hero render on the right with a round fade (so spell effects in a render's corners drop away). One per page |
| `.lane-cut`, `.lane-cut-enemy`, `.hero-stage` | The Lane Cut hero frame, its Dire edge, and the stage behind a render. Use them through the components in Lane Cut Frame below |
| `.lane-seg` + `.lane-seg-sm` | The Lane Board segmented control (view tabs, Plan For, the side switch): the chosen button (`aria-pressed`) takes the Lane Cut. `.is-radiant` and `.is-dire` colour a side switch |
| `.lane-digits` + `.lane-digit` | Position digits under a hero on a rail: the chosen one (`aria-checked`) is a small Lane Cut tile, a guess (`data-guess`) is dashed |
| `.lane-spine` + `.lane-node` | The Team Plan's mid lane: one bright line through the position cards, a node per card. `.lane-node-open` is a ring, `.lane-node-done` filled (picked), `.lane-node-now` the copper dot, only for Pick First |
| `.lane-check` | Lane Mark, our on/off checkbox (`<input type="checkbox" className="lane-check">` inside its `<label>`): a tile with the mid lane that lights copper with the logo dot when on. For settings that apply at once, never for a list of choices |

Reuse these before writing a new style. If a screen needs something new, add it here and to `globals.css` as a token
or class in its own small PR, then use it.

## Links

No underlined or plain text links anywhere. Every link is a designed control, picked by what it does:

| Link | Control |
| --- | --- |
| Back to the page above ("Back to My Heroes") | `.btn .btn-ghost .btn-sm` with `chevronLeft`, at the top left, `-ml-3` so the text lines up with the title |
| To another page from a hint ("Suggestions lean toward the heroes you pick") | The sentence, then a `.btn-secondary .btn-sm` at the end of the line that says what it does ("Edit My Heroes"). Sign in is `<SteamButton small />` |
| To another site (OpenDota, Steam) | `<ExternalButton>` or `<OpenDotaButton>`: a small ghost button ending in the `external` arrow, opening a new tab. Match numbers stay plain text |
| An action ("Answer Now", "Show Details", "Clear") | A real button; a disclosure gets `chevronDown` that turns over when open |
| A row or card in a list (a game, a Stack) | The whole row is the target: `.row-link` on its name, hover fill, `chevronRight` at the end when nothing else sits there. No per-row links to other sites |
| Paging ("Newer Games", "Older Games") | `.btn-secondary .btn-sm` with the chevron pointing the way it goes |

`src/app/no-text-links.test.ts` fails on `.link`, `underline` or `hover:underline` in a class list.

## Lane Cut Frame

Every hero on the Lane Board sits in the Lane Cut: the logo frame, a rounded square with the top right and bottom
left corners (where the mid lane leaves and enters) cut at 45 degrees, and a 1px lit edge that follows the cuts. The
cut and the corner grow with the frame, from 4px on a 20px face to 16px on the largest art (`laneCutStyle(size)`).
An enemy's edge is Dire red. The components are in `components/hero-frame.tsx`:

- **`HeroFace`**: a square crop of the 256x144 portrait, 20 to 64px, for rails, reason lines and chips. `isEnemy`,
  `isDim` (banned or out of play), and `isDecorative` when the name is written next to it.
- **`HeroStage` with `HeroArt`**: every large hero card shows the full-body render on our stage, never the 16:9
  portrait. `HeroArt` loads the render from the Steam CDN through `next/image`, at most 720px wide so it is never
  shown past its own pixels.
- **`CutOutline`**: an empty slot. Solid corners, dashed straight edges, in `line-control`.
- **`LaneMark`**: the 16px section mark, in the text colour.

## Team Plan

The Team Plan on /draft (`app/draft/team-plan.tsx`, `app/draft/super-team.tsx`) is the Lane Board's mid lane:

- **Position cards** on the lane, one per position: the render on the stage, the hero's name, Pos and the player (or
  the green You pill), its state, then the actions straight after (Picked and Banned, or Picked and Undo once picked).
  The right column, Why This Hero, is every reason the engine gives, one line each: an icon for its kind, the number
  bold first, the words, a 20px face before each hero it names. From 1024px one row; below that the reasons go under
  the hero. Cards in the lane share one height, spare space at the bottom.
- **Pick First** is the only copper: the node, the chip and the filled Picked button of that one card.
- **Another Super Team** forks off the lane at the bottom (dashed, 45 degrees): points behind, why, the heroes that
  differ as small render tiles, and Show Why for its own reasons and the team needs that differ.
- **Why This Is a Super Team** beside the lane from 1280px, under it below that: the style chip and plan line, Pair
  Frames (two heroes in one Lane Cut split by the lane, a neutral centre node with the relation icon, never copper) for
  the best pair, the edge against the enemy picks and the key combo, any other engine line, then Team Needs: a row per
  need with the faces covering it, amber with the triangle when missing.

## My Picks

My Picks on /draft (`app/draft/my-picks.tsx`) is the same mid lane at full width:

- The lane starts at the mark beside the view tabs. The **Best pick** is the copper stop across the lane (the node,
  the label chip and the filled Picked; nothing else on the page is copper): the render, the label the data allows
  (Clear Best Pick, Best Pick Right Now, Best of Your Heroes), Pos and the green You pill, score and place, the
  verdict, Why This Hero, the score split into From This Draft and From Meta, Role and Comfort with its Score Parts,
  and the engine's Reacting To line at its foot.
- **The other picks** are equal cards two to a row from 1024px, one per row below: the render, the rank, name and
  chips (Up 1 or New, Weak Here, Outside Pool), score and place, the verdict against the Best, every reason, Score
  Parts, then Picked (secondary) and an icon Banned. Cards in a row share one height, spare space at the bottom.
- **Reasons** read number first (`lib/pick-lines.ts` turns the engine's sentences into lines): one line per hero for
  counters and synergy, tags as sentences, hard counters as risks with the points they would cost, risks last on the
  amber band.
- **Score Parts** are centred bars: a positive part grows right in green, a negative one left in Dire red.
- The hero from **outside the pool** takes the next free cell as a dashed card; the **Score Ladder** (every listed
  score with the band the data could be off by) takes the last.

## Hero Art Rules

- **One face point.** Each hero's face centre on its render is measured once, in a 720 wide space, in
  `src/lib/hero-faces.ts` (some renders are not square, such as Broodmother at 720x360). `HeroArt` puts that point on
  the frame's anchor. A hero not measured yet falls back to the middle of a square render.
- **One size and one anchor per frame kind.** A frame kind (a Team Plan seat, the Best pick, a Pair Frame) defines
  one `HeroArtPlacement` (render width and anchor) and every hero in it uses that constant, so the faces line up
  across the row. No per-hero zoom or offsets.
- **Render or portrait.** Frames over 64px hold the render in a `HeroStage`; 64px and under use `HeroFace`.

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
- **Finding icons** (`FindingIcon`, Your Games): one icon per kind of strength or problem, the same everywhere: skull
  for deaths, coins for farm, swords for laning, flame for damage, heart for healing, castle for towers. On cards a
  40px `radiant-tint` or `dire-tint` tile with the 20px icon in `radiant` or `dire`; on list rows the bare 16px icon in
  that colour before the line.
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

One documented exception: the **next skill showcase** on the homepage (`.next-skill` and its `.ns-*` parts,
`components/next-skill-showcase.tsx`). Invoker weighs Wex against Exort for about 10 seconds, one step at a time
with slow eased fades, takes the one winning players took, and the two orbs float 4px on a slow loop throughout. It is the only scripted moment on the site, plays
once per visit, shows on wide screens only, and follows every other rule: base styles are the decided state, and the
whole sequence sits inside the reduced-motion query. `--orb-wex` colours the Wex glow there and nowhere else.

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
- [ ] No underlined text links; every link is a button or a whole row (see Links).
- [ ] Every action works by keyboard, has a visible key hint where it matters, and has an accessible name.
- [ ] Checked at 1280px, 1920px and phone width.
- [ ] Motion uses the tokens and classes above, confirms an action, and is off with reduced motion.
- [ ] New token or class? Added to `globals.css`, this page and the Design System artifact.
