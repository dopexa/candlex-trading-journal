# CandleX Design System v1.1 (logo palette)

Companion to `tokens.css` (the only place where raw colors, sizes and durations are defined).
Put both files in the repo (for example `docs/design-system.md` and `src/styles/tokens.css`)
and import `tokens.css` once at the app root.

## Principles

1. **Consistency over creativity.** If a value exists as a token, use the token.
2. **Boldness in four places only**: background chart, the animated 3D logo and sidebar, depth of the hero
   and account cards, the Net P&L hero card. Everything else stays quiet. The dashboard is calm: at most 4 cards.
3. **Color means money.** Green is profit, red is loss, purple (from the logo) is the brand accent, and orange
   (`--cx-warn`) appears only for "close to a limit" status. There is no yellow in the brand.
   Never use these colors for decoration, and never use color as the only signal: always show the sign (+/-)
   or a label.
4. **Numbers are the product.** All money values use `.cx-num` (tabular numerals) and a fixed currency format.
5. **Document everything.** A new component is not done until it has an entry here.

## Naming rules

| Thing | Rule | Example |
|-------|------|---------|
| Tokens | `--cx-<category>-<name>` | `--cx-space-4`, `--cx-radius-card` |
| Components | PascalCase, one concept per name | `KpiCard`, `DayCell`, `RuleGauge` |
| Variants and sizes | lowercase props | `variant="primary"`, `size="sm"` |
| States | data attributes or props, not new class names | `data-state="breached"` |
| Money formatting | one helper `formatMoney(value, currency, {sign})` used everywhere | `+$1,240.50`, `-$320.00` |

## Tokens (summary)

| Category | Tokens | Notes |
|----------|--------|-------|
| Surfaces | `ink`, `surface`, `raised`, `border`, `border-strong` | Cards use `surface`, floating panels use `raised` |
| Text | `text`, `muted`, `on-accent` | Muted is for labels and secondary text only |
| Brand | `accent` #8B47E1, `accent-hover`, `accent-press`, `accent-text` #B98CFF, `neutral` #686D78, `wordmark` #C4C6CD | From the logo. `accent` for fills, `accent-text` for purple text |
| Semantic | `profit`, `loss`, `loss-text`, `warn`, `status-safe/close/breached` | Use `loss-text` for small red text. `warn` only for the "close" status |
| Tints | `profit-1..4`, `loss-1..4` | Calendar and heatmap intensity steps |
| Type | Manrope + Noto Sans Georgian; 12, 14, 16, 20, 28, 40; weights 400, 500, 700 | Georgian needs the fallback font |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64 | 8px grid with a 4px half step |
| Radius | input 8, card 12, panel 16, pill | |
| Elevation | `elev-1..3`, `glow-profit`, `glow-accent` | Borders first, shadow second |
| 3D | `perspective` 1200px, `tilt-max` 6deg, `lift` 8px | Tilt only on KPI, account and gallery cards |
| Motion | 120 / 220 / 300 / 600 ms, stagger 40ms | All collapse to 0 with reduced motion |

### Contrast (approximate, verify in the browser before shipping)

| Pair | Ratio | Use |
|------|-------|-----|
| text on surface | 13.6 | Body text |
| muted on surface / raised | 6.7 / 5.8 | Labels, secondary text |
| profit on surface | 7.0 | Text and icons |
| loss-text on surface / raised | 5.4 / 4.7 | Small red text (plain `loss` on raised is below 4.5, use it only for fills and large text) |
| accent-text on surface / raised | 6.4 / 5.6 | Purple text, links, active icons |
| white on accent | 5.1 | Primary button label |
| white on accent-hover | 6.4 | Hover state of the primary button (hover darkens, it does not lighten) |
| accent (fill) on surface | 3.2 | Shapes, indicators, large elements only. Never small text |
| border-strong on surface / raised | 3.6 / 3.1 | Input borders (3:1 required for controls) |
| neutral (logo gray) on surface | 3.1 | Decorative logo shapes only |

---

## Components

### Button

| Variant | Use when |
|---------|----------|
| primary | One main action per view: "Add trade", "Save" (purple fill, white text) |
| secondary | Supporting actions (raised background, border) |
| ghost | Toolbar and tertiary actions |
| danger | Destructive confirm (loss color) |

Sizes: sm 32px, md 40px (default), lg 48px. Props: `variant`, `size`, `loading`, `disabled`, `iconLeft`, `shortcutHint`.

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Flat purple fill with a soft purple glow on primary | |
| Hover | Fill lightens | 120ms |
| Active | Moves down 1px along Z, shadow shrinks | Press feel |
| Focus | `--cx-focus-ring` | Keyboard only (`:focus-visible`) |
| Loading | Label replaced by a small spinner, width kept | `aria-busy="true"`, click ignored |
| Disabled | 40% opacity | Non-interactive, `aria-disabled` |

Accessibility: native `<button>`; icon-only buttons need `aria-label`; shortcut hint is `aria-keyshortcuts`.
Do: one primary button per view. Don't: use red as a primary button color.

### Field (input, number, select, textarea)

Anatomy: label above, control, helper or error text below. Height 40px, radius 8, border `border-strong`.
States: default, hover (border lightens), focus (ring), filled, error (loss border + `loss-text` message with an
icon), disabled, read-only.
Accessibility: label linked with `for`/`id`, error linked with `aria-describedby`, `aria-invalid="true"`.
Money fields: `inputmode="decimal"`, right-aligned with `.cx-num`, currency shown as a suffix.
Do: validate on blur and on submit. Don't: clear the field on error.

### Chip and Badge

| Kind | Use | Notes |
|------|-----|-------|
| Choice chip | Emotions, filters | Toggle, `aria-pressed`, selected = raised fill + purple border |
| Tag chip | Tags | Removable, `aria-label="Remove tag <name>"` |
| Status badge | Account status, rule status | Dot + text (safe, close, breached), never color only |
| P&L badge | Trade or tile result | Sign always shown, `loss-text` for red text |

### KpiCard and AccountCard (3D cards)

Variants: `hero` (full width, Net P&L 40px with sparkline, the only KPI card on the dashboard), `small` (label,
value, trend hint; used on the Analytics and Accounts pages, not on the dashboard).
Structure: `surface` background, 1px `border`, `elev-1` with inner top highlight, optional colored glow.
Behavior: pointer tilt up to `--cx-tilt-max` and `translateZ(--cx-lift)` on hover; value counts up once when
entering view (600ms); entrance fade + 12px rise, staggered by 40ms.
States: loading (skeleton), empty ("No data yet" with one action), error (inline message + retry).
Accessibility: the card is a region with an accessible name; tilt and count-up are disabled with reduced motion
and on touch devices; the final value is always in the DOM text.
Don't: tilt every element. Only the hero card, account cards and gallery tiles.

### AnimatedLogo (3D)

The owner's logo, never redrawn. Reference implementation: `candlex-logo-3d.html`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `layout` | `"stacked"` \| `"row"` | stacked | Row = mark + wordmark for the sidebar |
| `size` | number | 340 (row: 44) | Width of the mark in px |
| `animated` | boolean | true | False renders the static SVG |

Layers (back to front): purple disc, gray X band, purple band, gray blade, 36px apart on Z.
States: entrance (900ms, staggered), idle sway (9s), hover (tilt toward pointer, layers spread), reduced motion
(static). Collapsed sidebar shows the mark only. Accessibility: `role="img"` with `aria-label="candleX"`; layers
are `aria-hidden`; the wordmark is live text. Do: use it in the sidebar, login and empty states.
Don't: animate it on every page section or change its colors or proportions.

### Sidebar and NavItem

Sidebar: 264px, collapsible to 72px (state remembered). Order: logo, "Add trade" button, groups
(OVERVIEW, TRADING, SYSTEM), pinned profile card.
NavItem: 44px tall, icon 20px, 12px gap, label; group label 11px uppercase with `--cx-tracking-label`.

| State | Visual |
|-------|--------|
| Default | Muted text and icon |
| Hover | Lighter background, icon shifts 2px right |
| Active | `raised` background, 3px purple left indicator, purple icon (`accent-text`), `aria-current="page"` |
| Collapsed | Icon only, tooltip with the label on hover and focus |

Mobile (under 768px): bottom tab bar with 4 destinations + floating "+" button, "More" sheet for the rest,
safe-area insets respected.
Accessibility: `<nav aria-label="Main">`, groups as lists, arrow keys optional, Tab moves through items.

### DayCell (calendar)

Props: `date`, `pnl`, `maxAbsPnl`, `isToday`, `isOutsideMonth`, `isBest`, `isWorst`, `selected`.
Visual: date top left, P&L bottom right (`.cx-num`, abbreviated on mobile like +1.2k), background from
`profit-1..4` or `loss-1..4` using `|pnl| / maxAbsPnl` (quartiles). Empty days stay quiet; today has an
purple ring; best and worst day of the month get a soft glow.
States: default, hover (lift), focus, selected, no data.
Accessibility: grid role, each cell a button with `aria-label="12 October, profit 240 dollars"`;
arrow keys move between days, Enter opens the day panel.
Do: always show the sign. Don't: rely on the tint alone.

### Modal and SidePanel ("Add trade", day editor)

Modal: radius 16, `elev-3`, backdrop blur, max height viewport minus 64px, content scrolls inside.
Entrance: rises with slight `rotateX` and scale (220ms). SidePanel becomes a bottom sheet on mobile.
Accessibility: `role="dialog"`, `aria-modal="true"`, labelled by its title, focus moves in on open, is trapped,
returns to the opener on close; Esc closes, Ctrl/Cmd+Enter saves.
"Add trade" form groups: instrument, direction, size; entry, exit, P&L; account, date; tags, emotions;
screenshots. Removed fields (market conditions, trade rationale, lessons learned) are not rendered anywhere.

### RuleGauge (new, prop rules tracker)

Problem: prop accounts have limits that must be visible at a glance (profit target, drawdown, minimum days,
consistency). Existing progress bars do not carry a status or a threshold.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | string | | "Drawdown buffer" |
| `value` | number | | Current amount |
| `limit` | number | | Target or limit amount |
| `kind` | `"target"` \| `"limit"` | | Target fills toward good, limit fills toward bad |
| `status` | `"safe"` \| `"close"` \| `"breached"` | derived | Close at 80%, breached at 95% for limits |
| `approximate` | boolean | false | Shows an "approx." tag (trailing intraday drawdown) |

States: safe, close, breached, loading, no limit set (card hidden, not empty).
Accessibility: `role="progressbar"` with `aria-valuenow/min/max` and a text equivalent
("Drawdown buffer: 1,240 of 2,500 used, close to the limit").

### Toast

Bottom right (above the tab bar on mobile), 5s, with an "Undo" action for deletes. `role="status"` for success,
`role="alert"` for errors. Pause on hover and focus. Do not stack more than 3.

### GalleryTile (new, screenshot gallery)

Problem: screenshots are only visible inside each trade form, so mistakes cannot be reviewed in bulk.
Props: `thumbUrl`, `instrument`, `date`, `pnl`, `emotion`, `onOpen`.
Visual: thumbnail (webp about 480px) with P&L badge top left, emotion chip bottom, very subtle tilt on hover.
States: loading (skeleton), loaded, error (placeholder with retry), selected (compare mode).
Lightbox: arrows between images, Esc closes, `+`/`-` zoom, focus trapped, alt text built from instrument,
date and result.

### Skeleton and EmptyState

Skeleton: same size as the final content, slow shimmer (disabled with reduced motion).
EmptyState: one icon or the logo mark, one sentence, one primary action ("Add your first account").
Never render an empty chart.

---

## Patterns

| Pattern | Rule |
|---------|------|
| Dashboard | Maximum 4 cards and 5 visible numbers in the first screen; details live on their own pages |
| Data display | Money right-aligned with `.cx-num`; negative values use the minus sign and `loss-text`; positive values show `+` |
| Status language | Safe = green, close = orange, breached = red, always with a text label |
| Forms | Labels above, validation on blur, errors explain the fix, primary action bottom right |
| Feedback | Toast for saved and deleted (with Undo), inline message for field errors, banner for account risk warnings |
| Loading | Skeletons, never full-page spinners |
| Mixed currencies | Never add different currencies; show a note when the selection mixes them |
| Background animation | `BackgroundChart` canvas, fixed, `pointer-events: none`, 10 to 22% opacity, paused when the tab is hidden, static frame with reduced motion, toggle in Settings |

## Governance

- Before shipping a visual change: no raw hex, pixel or millisecond values outside `tokens.css`; contrast
  checked; keyboard path tested; reduced motion tested; checked at 360px.
- Changing a token value is allowed. Renaming or removing a token needs a note in a `CHANGELOG.md`
  and a replacement across the repo in the same change.
- Every new component gets an entry in this file (variants, states, accessibility) in the same change.

## Project audit and implementation notes

### Initial design audit

The read-only audit covered the two inline style blocks in `index.html`. Before token adoption it found 219
hex-color occurrences (154 distinct), 754 literal spacing values in margin/padding/gap declarations (62
distinct), 262 literal `font-size` declarations (34 distinct), and 86 literal duration values in
animation/transition declarations (19 distinct). These totals include superseded rules in the monolithic
stylesheet; generated inline styles and JavaScript canvas colors were not part of those counts.

Baseline score: 34/100. Existing screens already supplied several useful states, but CSS and markup were
duplicated and components did not have a shared renderer or consistent state/accessibility contract.

### Shared renderer coverage

| Component | Shared renderer | Variants and states | Accessibility |
|-----------|-----------------|--------------------|---------------|
| Button | `CandleXUI.Button` | primary, secondary, ghost, danger; sm, md, lg; loading, disabled | Native button, `aria-busy`, disabled state, shortcut hint |
| Field | `CandleXUI.Field` | input, select, textarea; default, filled, error, disabled, read-only | Linked label, error description, `aria-invalid` |
| Chip / Badge | `CandleXUI.Chip`, `CandleXUI.Badge` | choice/tag; safe, close, breached; profit/loss/flat | Choice uses `aria-pressed`; removable tags get a label |
| KpiCard | `CandleXUI.KpiCard` | default, loading/empty hooks, optional tilt and trend | Named region; number value remains text |
| NavItem | `CandleXUI.NavItem` | default, active, collapsed | `aria-current="page"` for the active item |
| DayCell | `CandleXUI.DayCell` | empty, profit, loss, flat, today, best, worst, selected, outside | Native button with date and signed result label |
| Modal | `CandleXUI.Modal` | labelled dialog, optional footer | Dialog role; app shell adds focus entry, Tab trapping, Escape handling and focus restoration |
| RuleGauge | `CandleXUI.RuleGauge` | safe, close, breached, approximate | Progressbar value and text label |
| Toast | `CandleXUI.Toast` | success, error, optional Undo; pauses on hover/focus; max three | `role="status"` or `role="alert"` |
| GalleryTile | `CandleXUI.GalleryTile` | loading/loaded image state; selected state on compare control | Lazy image, descriptive alt text, focus-visible outline; related thumbnails and lightbox are keyboard operable |
| Skeleton | `CandleXUI.Skeleton` | shimmer / reduced-motion still state | Announces loading status |
| EmptyState | `CandleXUI.EmptyState` | single action or informational | Native primary action |

The monthly summary tiles, empty-state helper, calendar cells, navigation active state, account rule gauges,
gallery tiles and app toast function use the shared renderers/state behavior. Gallery thumbnails are generated
as private 480px WebP data in the existing `trade_data.imageThumbnails` JSON field; old images are converted in
the browser when possible and fall back to their signed Storage URL. The Toast renderer supports Undo for
deleting a fee or payout.

### Naming and migration conventions

- Keep the existing HTML file and vanilla JavaScript architecture; use PascalCase renderer names in
  `CandleXUI`, lowercase `variant`/`size` props, and `data-state` for state styling.
- New design tokens use the `--cx-` namespace. Legacy declarations are centralized in `tokens.css`;
  hashed compatibility names are retained until the associated page styles can be migrated safely.
- Keep public files under relative paths (`./styles/`, `./assets/`) so GitHub Pages continues to work from
  the repository subpath.

### Data storage notes

- The existing hosted app stores account lists and settings in JSON columns in `user_preferences`. Account
  currency, prop rules, fees and payouts are normalized and persisted there, compatible with existing installs.
- Daily results continue using the existing per-user endpoint. Trade time, entry and exit price, and thumbnail
  data use the existing `trades.trade_data` JSON payload.
- `trade_images` remains the private screenshot index. Full image URLs are signed; thumbnails stay in private
  trade JSON, and the app does not create public Storage objects.
- `migration.sql` from the design archive was treated as a reference only. No production migration is needed;
  this change does not create the proposed `prop_accounts` table or summary view.
