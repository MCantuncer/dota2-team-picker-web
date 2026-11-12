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
| `.lane-cut`, `.lane-cut-enemy`, `.lane-cut-you`, `.hero-stage` | The Lane Cut hero frame, its Dire edge, the green edge of the player's own hero, and the stage behind a render. Use them through the components in Lane Cut Frame below |
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

My Picks on /draft is the Pick Strip (`app/draft/pick-strip.tsx`) on the same mid lane at full width. The answer to
"what do I pick" sits straight under the board, so it needs no scrolling; Who Has the Better Chance comes after it.

- **The strip** is every listed hero side by side: eight tiles in one row from 1280px, four to a row from 640px, one
  row per hero on a phone. A tile is the render in a Lane Cut, the name, the score with its strength, the main
  reason (number first, a face before each hero it names) and Picked. The rows of every tile line up (subgrid).
  The first tile is the copper one: the ring, the label and the filled Picked.
- **Win chance**: when a checked model gives one, the change a pick makes ("+1.2%") follows the score on its tile,
  green or Dire red, and the card spells it out ("+1.2% win chance").
- **Strength** is five rising bars beside the score: where the hero stands among every hero for the position in this
  draft, in fifths (five bars for the top fifth). Red when the score is below 0. The legend sits in the lane's head.
- **On the art**: only the Best label (top right; beside the name on a phone) and the risk mark (bottom left: the
  warning icon and the enemy's face). Up 1, New and Outside Pool are a chip beside the name.
- **The label** on the first tile is Best when no hero for the position scores higher, else Your Best. The open card
  has the full label: Best Pick Right Now (Clear Best Pick when the gap beats the error), or Best of Your Heroes
  (Clear Best of Your Heroes) when another hero scores higher. A label never contradicts the place line.
- **One full card** under the strip (`BestCard` in `app/draft/my-picks.tsx`) is the open hero's: the Best pick at the
  start, any other after a click on its tile (the tile is a pressed button, with a caret under it). The card has the
  render, the label or the place in the list (2nd Pick), Pos and the green You pill, score and place, the verdict,
  Picked and an icon Banned, Why This Hero, the score split into From This Draft and From Meta, Role and Comfort
  with its Score Parts, and the engine's Reacting To line at its foot. Only the Best pick's card is copper.
- **Number keys** (`1` to `8`; the hero from outside the pool takes the next number) open that pick's card, on the
  page or in an empty hero box; `Enter` then marks it Picked. A tile shows its number as a `.kbd` badge on the art and the lane's
  head says what the keys do (both from 768px, where a keyboard is likely). A digit in a box with letters is still
  the hero's position (`cm5`), and the position picker keeps 1 to 5 for itself.
- **A score has its unit** on the card: the number, then Points, then the place ("+11.1 Points, 2nd of 49 Mids").
- **Reasons** read number first (`lib/pick-lines.ts` turns the engine's sentences into lines): one line per hero for
  counters and synergy, tags as sentences, hard counters as risks with the points they would cost, risks last on the
  amber band.
- **Score Parts** are centred bars: a positive part grows right in green, a negative one left in Dire red.
- **Risk** is amber on a good pick with one bad matchup: the mark on the tile, and on the card the chip with the
  warning icon, the word, the enemy's face and name. **Weak Here** is only for a hero whose whole score is below 0,
  so it shows only on a card.
- The hero from **outside the pool** is a dashed tile after the list; its card starts with the engine's line on it.
- **Not This Game** takes the columns the tiles leave: the player's other heroes that score below 0 share one dashed
  box (face, name, score in Dire red, and the score part that sinks each, with the enemy when it is the matchups)
  instead of a tile each. Each still opens its card. The first hero always keeps its tile, even below 0.
- The **Score Ladder** (every listed score with the band the data could be off by) closes the lane.

## Per Player

Per Player on /draft (`app/draft/per-player-view.tsx`) is the same mid lane at full width, one section per player
who still has to pick:

- Each section starts at its **seat**, a stop on the lane with the position icon: Pos and role, the player's name or
  the green You pill, how many of their heroes are listed (Any Hero when the list is every hero), and the Team Plan's
  hero for the seat as a 20px face.
- The player's heroes are **pick cards** (`PickCard` in `app/draft/my-picks.tsx`), two to a row from 1024px, one per
  row below, one lane stop per row (filled for the player's first, open after): the render, the rank, name and chips
  (Up 1 or New, Risk, Weak Here, Outside Pool), score and place, the verdict against the first, every reason, Score
  Parts, then Picked (secondary) and an icon Banned. Cards in a row share one height, spare space at the bottom.
  Reasons, tags and titles use the player's name.
- **In Team Plan** is a neutral chip with the lane mark on the hero the plan chose for the seat. The plan's **Pick
  First** is the only copper card: the ring, the node, the chip and the filled Picked.
- The proven **outsider** takes the next free cell as the dashed card, under that player's section.

## Your Game

Your Game (`components/game-story-panel.tsx`, `components/player-view.tsx`) is the finished draft's answer area:

- A **seat strip** of our five players: 40px face, hero name with the green You pill, role icon and name through
  `PositionLabel`, then the player's name. The viewer's seat comes first and opens; the strip scrolls sideways, never
  truncates.
- Three **answer tabs** (`components/answer-previews.tsx`): cards (`rounded-xl`, line-strong border, raised and a
  copper underline when open) that show their answer on the tab itself: the next four core items with minutes, the
  lane verdict chip with the enemy laner and the Ready at N Min chip, the first six skill icons. Each tab is named by
  its view (`aria-label`) and described by a sentence of its preview; the preview art is hidden from screen readers.
  Below 640px the cards drop the previews and read as a three-part row.
- Keys **I**, **G**, **S** open Item Build, Game Story, Skills and Talents while focus is inside Your Game (never
  from an input, never with a modifier), shown as `.kbd` on each tab and in `aria-keyshortcuts`.
- The team's part (headline, The Team line, game plans, Danger Heroes, If the Game Goes Wrong) lives on the Game
  Story tab alone, so no tab repeats it.

## Hero Art Rules

- **One face point.** Each hero's face centre on its render is measured once, in a 720 wide space, in
  `src/lib/hero-faces.ts` (some renders are not square, such as Broodmother at 720x360). `HeroArt` puts that point on
  the frame's anchor. A hero not measured yet falls back to the middle of a square render.
- **One size and one anchor per frame kind.** A frame kind (a Team Plan seat, the Best pick, a Pair Frame) defines
  one `HeroArtPlacement` (render width and anchor) and every hero in it uses that constant, so the faces line up
  across the row. No per-hero zoom or offsets.
- **Render or portrait.** Frames over 64px hold the render in a `HeroStage`; 64px and under use `HeroFace`.

## Build Path

The Item Build tab's Build Path (`components/build-path.tsx`):

- **Kits**: Start and Lane as 64x47 item tiles (`rounded-md`) with the full name under each, a copy count badge, and a
  20px enemy face (Lane Cut, Dire ring) on items bought for this draft. The enemy is in the tile's name ("Healing
  Salve, for Shadow Fiend"). Lane items carry no minute.
- **Path**: the core items (and lane items this draft asks for) in buy order on one line: the minute big
  (`.num`, 22px), the tile, the full name, then Late After N in warn. One dot per item on the line.
- Every tile is a toggle (`aria-pressed`); the open one has a copper ring. Its **detail** opens right under it: art,
  name, a Dire tint chip "For <Enemy>" with the faces, the numbers as stat blocks (Usual, Late After, Copies) and at
  most two sentences. The draft's first answer item is open to start.
- Phone: the path turns into a vertical list (tile, minute, name and late minute) on a vertical line, the detail
  under the open row. The path scrolls sideways on narrow desktops (a labelled, focusable region).

## Game Clock

The Game Story tab's minute line (`components/story-timeline.tsx`) with three marks on top of the key items:

- **Fight window**: when our team is ready before the enemy item the headline races (`Story.race`), a copper band on
  the axis from our ready minute to theirs, the ready label reading "Fight Here, 15 to 17". When they are first, a
  Dire band reads "Hold Until N".
- **Checkpoint flag**: the viewer's key item late minute as a dashed warn line down to a warn chip with the question
  ("No Blink Dagger by 20 min?") and the answer under it. Past 70% of the axis the label sits left of the line.
- **At 20 Min**: the team's fallbacks as two cards, Ahead (radiant left edge) then Behind (dire left edge), question
  bold in the side's colour and the answer under it.

## Skill Track

The Skills and Talents tab (`components/skill-plan-card.tsx`, `components/skill-track.tsx`):

- **Agreement meter** under Skill Order: an 8px radiant meter and "57 of 59 high-rank wins used this order"
  (`SkillPlan.agreement`); the build reason sentence only when there is no order.
- **Max order**: each basic ability as a chip (32px icon, name, Max by N) in the order they are maxed, chevrons between
  on wide screens, then the ultimate in an accent tint chip with the levels it takes.
- **Track** (default) or **Grid** (`.seg` switch): the track is one 40px cell per level, the level number over the
  ability icon, the talent mark in an accent tint, or a dashed No Point cell. The grid is the game's skill build table.
- **Talent tree**: level 25 on top, mirrored; the pick is lit (semibold, copper share bar), the other side muted with
  a line-control bar. Bars are the share of recent high-rank games that took each talent, with the number beside;
  a Players Split chip when the two shares are under 15 points apart.

## Lane Board

The Game Story tab's Lanes block (`components/lane-board.tsx`):

- **Lane map**: the logo's square (Radiant bottom left) with the three lanes as lines coloured by verdict (radiant
  won, line-control even, dire hard); the player's lane is full strength with a glow, the others at 55%. Faces are
  30px Lane Cut `HeroFace`s on the lines (enemies with the Dire edge), lane names and verdicts as text. One `role="img"`
  names every verdict.
- **Versus**: the player's render and the enemy they meet most (the highest `weight` pair) in 3:2 `HeroStage` frames,
  one `HeroArtPlacement` for both, the enemy mirrored with `HeroArt mirror`. Name and `PositionLabel` under each
  ("Enemy" before the enemy's role). A "Lane: Hard" chip between them.
- **Pair bar**: won, even, lost as one 12px bar (radiant, line-control, dire), the shares big under it, then how many
  lanes they come from. The heading says "Lane results at your rank" or "from all ranks" (`allRanks`).

## Heroes, icons, states

- **Hero portraits** are 16:9 from the Steam CDN, `object-cover`, `rounded-xs`. Sizes: 40x22 search rows and chips,
  64x36 strips, 80x45 draft slots, 112x63 suggestion cards. Square icons (OpenDota `icon`) where a portrait does not
  fit. Missing art is a slate tile with the full name in `.micro`, never a coloured placeholder.
- **Picked** by your team: 3px `radiant` top bar. By the enemy: 3px `dire` top bar. **Banned**: greyscale, darkened,
  with a `ban` slash.
- **Draft board rails** (`app/draft/draft-rails.tsx`): each rail's search box sits in its heading row (title, the
  side switch or hint, then the box, which is also the Tab order); on a phone the box takes its own row. **Bans** are one line under the two teams
  (`BanLine`, `BanFace`): title and count, the box, then every ban as a 26px greyed `HeroFace` with the `ban` slash.
  A game has 15 or more bans, so they never get full slots: the line wraps instead of pushing the picks down.
- **Draft order on a phone that follows a PC**: while the PC reads Dota, or after another device put a hero on the
  board, the phone shows the header, the Live from Your PC note, then My Picks, then the board (CSS `order`, the
  markup keeps its order). The PC fills the board, so the phone leads with the answer. A phone the heroes are typed
  on keeps the board on top, and so does every wider screen.
- **Icons**: Lucide, outline, 16px in controls, 20px in large buttons and empty states, `currentColor`. An icon takes
  a signal colour only with its meaning (warning triangle in `warn`). No emoji.
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
