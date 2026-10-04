# 02 — TaskForge Design System

> **Status:** ACTIVE
> **Role in the documentation set:** Design tokens, component specifications, interaction and
> accessibility patterns, motion rules, and iconography.
> **Master instruction file:** `AGENTS.md` — governs all work, including this document.
> **Product authority:** `docs/00_PROJECT_OVERVIEW.md` — product identity, principles, and scope.
> **Requirements authority:** `docs/01_PRODUCT_REQUIREMENTS.md` — features, delivery states, and
> acceptance criteria. This document must not contradict either.

**Nothing in this document is implemented.** No application code exists. Every value here is a
specification to be implemented and then verified, not a description of something that exists
(`AGENTS.md` §7.1).

### How to read this document

| Label | Meaning |
|---|---|
| **Approved** | Fixed by an approved product decision or the established visual direction. Change requires justification |
| **Proposed** | A concrete specification proposed here, open to revision. Not an approved product decision |
| **Unresolved** | Depends on an open decision. Marked with the decision ID and **must not** be treated as settled |

**Decisions this document must not resolve:** **D-02** (breakpoints), **D-15** (default theme
resolution), **D-18** (accessibility conformance level). Where this document needs them, the
relevant sections are explicitly labeled provisional.

---

## 1. Design Principles

### 1.1 Visual identity

TaskForge should feel **quietly precise** — the visual confidence of a well-made instrument, not
the visual noise of a feature showcase. The interface is a working surface; the work is the
content.

The identity rests on four approved anchors:

- **White-first light theme** — light is the default, not an afterthought. The dark theme is a
  peer, not a downgrade.
- **Primary cyan `#16A6B5`** — the single action color. Used for one thing: the primary action on
  a surface. Its scarcity is what makes it read as premium.
- **Graphite text** — near-black with a cool cast, never pure `#000000`. Long reading sessions in
  a task tool demand it.
- **Champagne secondary accent `#D6A66A`** — a warm metallic note used sparingly for emphasis,
  selection, and identity. Never a second primary.

**Reference posture.** The system draws on the *restraint* of Linear, the *contrast discipline*
of Vercel, and the *information density* of Asana. It takes **no** layout, component, asset, or
branding from any of them. Where a pattern is category-standard, it is used because it works, not
because it was seen.

**Explicit prohibition.** Purple and lavender are **not** primary, secondary, or accent
directions. They do not appear in the token set, including in dark theme. If a future need
introduces a violet, it is a proposal requiring approval, not an implementation detail.

### 1.2 Hierarchy

Hierarchy is created by **weight, spacing, and color** before any ornament. Order of application:

1. **Type size and weight** — the primary hierarchy signal.
2. **Vertical rhythm** — spacing scale (§4.1) groups related content and separates unrelated
   content.
3. **Color weight** — muted text recedes; primary text leads.
4. **Surface elevation** — borders and fills, not shadows, separate regions.
5. **Motion** — used only to explain a change, never to draw attention to itself.

### 1.3 Density

TaskForge is a tool used for hours at a time. Density is **comfortable-compact**: closer to a
professional tool than to a marketing page, but not cramped. Concretely:

- Default control height 36px; compact variant 32px.
- Default line height 1.5 for body text.
- Table rows 40px; list items 40px.
- Kanban cards carry 12px internal padding and 8px gaps.

Density is adjustable in three steps — **compact**, **comfortable** (default), **spacious** — and
all three must remain legible and operable. Density is never reduced below the compact step.

### 1.4 Consistency

The same concept looks and behaves identically everywhere. A button is one component; a card is
one component. New patterns are **extensions of existing components before they are new
components** (`NFR-VIS-003`). Divergence requires a documented reason, not preference.

### 1.5 Clarity

Every element must earn its place (§ overview, principle *"Clarity over clutter"*). A screen
should be able to lose 20% of its chrome with no loss of function. When a rule cannot be
simplified, it is removed.

### 1.6 Interaction philosophy

- **The interface responds immediately and then confirms.** Optimistic feedback is permitted only
  where a failed action is recoverable and the outcome is stated.
- **No state is implied by appearance alone.** A control that looks inert must be visibly inert,
  with a reason (`NFR-ACCESS-008`).
- **Destructive and consequential actions require confirmation** (`NFR-ERR-004`). Task deletion is
  destructive; project archiving is consequential but non-destructive and reversible.
- **Nothing that looks operable is inert.** Coming Soon representations are labeled in text and
  visibly unavailable. This is the single most important honesty rule in the system.

---

## 2. Color System

All values are **Approved** unless marked otherwise. Tokens are semantic — components reference
tokens, never raw hex (§11).

### 2.1 Core palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `color.brand.600` | `#16A6B5` | `#2BC4D4` | **Primary cyan.** Primary actions, active nav, focus |
| `color.brand.700` | `#128795` | `#1FA3B2` | Primary hover |
| `color.brand.800` | `#0E6A75` | `#17838F` | Primary pressed |
| `color.brand.100` | `#DFF4F6` | `#0D3B42` | Primary subtle background, selection |
| `color.brand.200` | `#A8E4EA` | `#12525C` | Primary subtle border |
| `color.accent.500` | `#D6A66A` | `#E3B87F` | **Champagne secondary accent.** Emphasis, selection detail |
| `color.accent.600` | `#BC8E52` | `#CFA067` | Accent hover |

The dark-theme brand values are lightened so that contrast against charcoal surfaces holds
(§8.4). Cyan `#16A6B5` on charcoal fails text contrast, so the dark theme uses a lighter step of
the same hue. **The hue is constant; only lightness changes.**

### 2.2 Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `color.bg.canvas` | `#FFFFFF` | `#141618` | **White-first light.** Page background |
| `color.bg.surface` | `#FFFFFF` | `#1B1E21` | Cards, panels, dialogs |
| `color.bg.subtle` | `#F7F9FA` | `#22262A` | **Off-white surface.** Table headers, inset regions, hovers |
| `color.bg.muted` | `#EFF2F4` | `#2A2F34` | Disabled fills, skeleton base |
| `color.bg.overlay` | `rgba(16,22,26,0.44)` | `rgba(0,0,0,0.60)` | Dialog and menu scrim |
| `color.bg.inverse` | `#1B1E21` | `#FFFFFF` | Tooltip background |

Light surfaces are white-first with a single off-white (`#F7F9FA`) providing the only tonal step.
More steps would read as noise.

### 2.3 Text — graphite

| Token | Light | Dark | Use |
|---|---|---|---|
| `color.text.primary` | `#1F2429` | `#EDEFF1` | **Graphite.** Headings, body, primary content |
| `color.text.secondary` | `#525C63` | `#A8B0B7` | Supporting text, descriptions |
| `color.text.muted` | `#7A848C` | `#79838B` | **Muted.** Metadata, placeholders, captions |
| `color.text.inverse` | `#FFFFFF` | `#141618` | Text on solid brand or inverse fills |
| `color.text.brand` | `#0E6A75` | `#2BC4D4` | Links, active states |
| `color.text.danger` | `#B3261E` | `#F2857C` | Destructive text, validation errors |
| `color.text.success` | `#1E6B3A` | `#5CC98A` | Success text |
| `color.text.warning` | `#8A5A00` | `#E0B158` | Warning text |
| `color.text.onAccent` | `#3D2C10` | `#241A08` | Text on champagne accent fills |

`#1F2429` is graphite with a cool cast. **Pure black `#000000` is never used as text.**

### 2.4 Borders and dividers

| Token | Light | Dark | Use |
|---|---|---|---|
| `color.border.subtle` | `#EDF0F2` | `#262A2E` | Dividers inside a surface |
| `color.border.default` | `#DFE4E7` | `#31373C` | Card and input borders |
| `color.border.strong` | `#C3CBD1` | `#3D444A` | Hover borders, high-emphasis outlines |
| `color.border.focus` | `#16A6B5` | `#2BC4D4` | Focus ring |
| `color.border.danger` | `#F3C6C3` | `#5A2E2B` | Destructive input borders |

Borders, not shadows, define most boundaries (§4.6). Shadows are reserved for genuinely
floating surfaces.

### 2.5 Status colors

Defined for semantic completeness. **Never the sole carrier of meaning** — every status is
conveyed by text or icon as well (§8.5).

| Token | Light | Dark | Semantic use |
|---|---|---|---|
| `color.status.success.bg` | `#E7F4EC` | `#12301F` | Success surfaces |
| `color.status.success.border` | `#A8D9BC` | `#1E5236` | |
| `color.status.success.text` | `#1E6B3A` | `#5CC98A` | |
| `color.status.warning.bg` | `#FDF3E2` | `#33280F` | Warning surfaces |
| `color.status.warning.border` | `#EBD3A2` | `#54431C` | |
| `color.status.warning.text` | `#8A5A00` | `#E0B158` | |
| `color.status.danger.bg` | `#FCEBEA` | `#331A18` | Danger and validation |
| `color.status.danger.border` | `#F0B4B0` | `#5A2E2B` | |
| `color.status.danger.text` | `#B3261E` | `#F2857C` | |
| `color.status.info.bg` | `#E4F3F6` | `#0E333A` | Informational |
| `color.status.info.border` | `#A5DCE4` | `#17535E` | |
| `color.status.info.text` | `#0E6A75` | `#2BC4D4` | |
| `color.status.neutral.bg` | `#F1F4F5` | `#262B30` | Coming Soon, archived, neutral badges |
| `color.status.neutral.text` | `#525C63` | `#A8B0B7` | |

These semantic hues are additions beyond the approved palette, made because a complete status
system requires them. They are **muted to sit beside cyan** rather than compete with it, and none
is used as a large fill.

### 2.6 Interactive state tokens

| State | Treatment |
|---|---|
| **Hover (surface)** | `color.bg.subtle` fill, or `color.border.strong` border for outlined controls |
| **Active/pressed** | `color.bg.muted` fill, or `color.brand.800` for primary |
| **Focus-visible** | 2px `color.border.focus` ring at 2px offset; **never removed** |
| **Selected** | `color.brand.100` fill with `color.brand.600` left indicator |
| **Disabled** | `color.bg.muted` fill, `color.text.muted` label, `cursor: not-allowed`, removed from tab order |
| **Loading** | Label replaced by a spinner at the same optical size; width preserved to avoid layout shift |
| **Read-only** | Normal surface, `color.text.secondary` label, no focus ring, still announced |

### 2.7 Theme parity

Every semantic token has a defined value in **both** themes. A component that renders in one
theme must render in the other with no missing token. `NFR-VIS-004` and `AC-THEME-04` require
contrast to hold in both; §8.4 lists the contrast checks.

---

## 3. Typography

### 3.1 Family and fallback

**Proposed** — no font decision exists in any ACTIVE document. This is a specification proposal.

| Role | Stack |
|---|---|
| UI and body | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| Numeric (metrics, counts) | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace` |

System fallbacks precede web fonts in the stack, so the interface remains fully functional if a
web font fails to load (§9.7). **No web font is required for correctness.** Numeric values use a
monospaced face so figures align in tables and metric tiles.

### 3.2 Type scale

A 1.200 minor-third scale from a 14px base. `Proposed`.

| Token | Size | Line height | Weight | Letter spacing | Use |
|---|---|---|---|---|---|
| `type.display` | 28px | 34px | 600 | −0.4px | Empty-state headline, auth title |
| `type.h1` | 22px | 28px | 600 | −0.3px | Page title |
| `type.h2` | 18px | 24px | 600 | −0.2px | Section heading |
| `type.h3` | 16px | 22px | 600 | −0.1px | Card title, panel heading |
| `type.body.lg` | 15px | 22px | 400 | 0 | Descriptions, dialog body |
| `type.body` | 14px | 21px | 400 | 0 | **Default.** Body, list content |
| `type.body.sm` | 13px | 19px | 400 | 0 | Dense table cells, secondary |
| `type.label` | 13px | 16px | 500 | 0 | **Label.** Buttons, inputs, tabs |
| `type.meta` | 12px | 16px | 400 | 0 | **Metadata.** Timestamps, counts, captions |
| `type.overline` | 11px | 14px | 600 | 0.4px | **Caption.** Column headers, section eyebrows |

Negative letter-spacing increases with size — a standard optical correction that keeps large text
from looking loose.

### 3.3 Weights

| Weight | Use |
|---|---|
| 400 | Body, metadata |
| 500 | Labels, buttons, inputs, tabs |
| 600 | Headings, overline, active emphasis |
| 700 | **Not used.** No token requires it |

Four weights would be excessive; 700 is omitted so weight escalation is always visible.

### 3.4 Heading hierarchy

One `h1` per view. Levels descend without skipping. Component-level headings (`h3` inside a card)
are common and expected. Heading levels reflect document structure, not visual size — if a heading
looks too large, change the token, never the level.

### 3.5 Text truncation

- Single-line truncation uses an ellipsis and must not wrap.
- Multi-line body text wraps normally.
- Truncated text carries its full value in `title` **and** remains fully readable to assistive
  technology (§8.6).

---

## 4. Spacing and Layout

### 4.1 Spacing scale

A 4px base with a 2px half-step. **All spacing is a multiple of this scale** (`NFR-VIS-001`).

| Token | Value | Typical use |
|---|---|---|
| `space.0` | 0px | — |
| `space.1` | 2px | Badge inset, focus-ring offset |
| `space.2` | 4px | Icon-to-label gap, tight stack |
| `space.3` | 8px | **Default inline gap.** Card internal padding (compact) |
| `space.4` | 12px | **Default card padding.** Kanban card gap |
| `space.5` | 16px | Form field gap, list item padding |
| `space.6` | 20px | Panel padding |
| `space.7` | 24px | Card padding (comfortable), dialog padding |
| `space.8` | 32px | Section gap (compact) |
| `space.9` | 40px | Section gap (default) |
| `space.10` | 48px | Section gap (spacious) |
| `space.11` | 64px | Page vertical rhythm |
| `space.12` | 80px | Auth page vertical centering |

### 4.2 Content widths

| Context | Max width | Rationale |
|---|---|---|
| Forms, auth | 400px | Comfortable reading measure for short forms |
| Dialog | 480px (standard), 640px (wide) | Content-led |
| Reading content, empty states | 640px | Comfortable measure |
| Full application shell | Fluid, no max | Work surfaces must use available width |
| Settings panel | 720px | Comfortable for labelled rows |

Long-form content is always constrained. **Work surfaces are not** — a Kanban board must use the
width it has.

### 4.3 Page gutters

| Viewport | Gutter |
|---|---|
| ≥ 1280px | 32px |
| 1024–1279px | 24px |
| 768–1023px | 20px |
| < 768px | 16px |

**Proposed** — depends on **D-02**.

### 4.4 Card padding

| Variant | Padding |
|---|---|
| Compact | `space.3` 12px |
| **Comfortable (default)** | `space.4` 16px |
| Spacious | `space.7` 24px |
| Metric tile | `space.5` 20px |
| Kanban card | `space.3` 12px, with 8px internal gaps |

### 4.5 Density modes

| Mode | Row height | Card padding | Control height | Section gap |
|---|---|---|---|---|
| Compact | 32px | 12px | 32px | 32px |
| **Comfortable (default)** | 40px | 16px | 36px | 40px |
| Spacious | 48px | 24px | 44px | 48px |

One density value applies to the whole application at a time. Mixing densities within a view is
not permitted.

### 4.6 Radii

| Token | Value | Use |
|---|---|---|
| `radius.sm` | 4px | Badges, inputs (compact) |
| `radius.md` | 6px | **Default.** Buttons, inputs, cards |
| `radius.lg` | 10px | Dialogs, drawers, panels |
| `radius.full` | 9999px | Pills, avatars |

### 4.7 Elevation

**Borders separate regions; shadows are reserved for surfaces that float.** This keeps the
interface crisp and avoids the grey-haze effect of shadow-heavy layouts.

| Token | Value | Use |
|---|---|---|
| `shadow.none` | `none` | Most surfaces |
| `shadow.sm` | `0 1px 2px rgba(16,22,26,0.06)` | Cards at rest, sticky headers |
| `shadow.md` | `0 4px 12px rgba(16,22,26,0.10)` | Dropdowns, menus, popovers |
| `shadow.lg` | `0 16px 40px rgba(16,22,26,0.16)` | Dialogs, drawers |
| `shadow.focus` | `0 0 0 2px <bg>, 0 0 0 4px rgba(22,166,181,0.28)` | Focus ring, drawn outside the border |

**Dark theme shadows are weaker than light theme.** On a charcoal canvas, opacity reads far more
strongly. Dark-theme shadows use roughly half the light-theme alpha values; depth on dark is
communicated primarily by surface lightness steps (`color.bg.surface` → `color.bg.subtle`).

**No 3D effects.** No perspective transforms, no bevels, no inner/outer glows, no embossed or
skeuomorphic treatments, no 3D rotation or tilt on any element. Depth is conveyed only by the
elevation ladder above.

---

## 5. Responsive System

> **D-02 is `OPEN DECISION`.** The breakpoint values below are **design proposals pending
> approval of D-02**. They do not establish product acceptance boundaries. `AC-VIS-01` and
> `AC-VIS-02` remain **Blocked by D-02** and are not satisfied by this document.

### 5.1 Proposed breakpoints

| Token | Min width | Label | Layout intent |
|---|---|---|---|
| `bp.sm` | 0px | Small | Single column; sidebar collapsed to overlay; board scrolls horizontally |
| `bp.md` | 768px | Medium | Single column; sidebar overlay; full form width |
| `bp.lg` | 1024px | Large | Persistent sidebar (240px); drawer may be inline (420px) |
| `bp.xl` | 1280px | Extra large | Persistent sidebar (256px); drawer inline or overlay; gutters widen |

**Proposed.** Mobile-first: base styles target `bp.sm`, and each breakpoint is a minimum-width
enhancement. Only three adjustments are permitted per breakpoint: container padding, sidebar
mode, and drawer mode. **No layout may be hidden below a breakpoint** — hiding functionality is a
scope reduction and is not permitted (§1.6).

### 5.2 Sidebar behaviour

| Viewport | Behaviour |
|---|---|
| `< bp.lg` | Hidden. Opened by a menu button as an **overlay** with a scrim |
| `≥ bp.lg` | Persistent, 240px (`bp.xl`: 256px) |

When hidden, the sidebar is **not** removed from the document — it remains in the accessibility
tree when open and is removed when closed, so it is never focusable while off-screen
(§8.4).

### 5.3 Drawer behaviour

`FR-DRAWER-004` and `NFR-RESP-004` require the drawer to remain fully operable at every supported
size.

| Viewport | Behaviour |
|---|---|
| `< bp.lg` | Full-screen overlay (100% width, 100% height) |
| `≥ bp.lg` | Inline side panel, 420px, board compresses |
| `≥ bp.xl` | Inline side panel, 480px |

The drawer is never narrower than 320px, and never a partial-width sheet that clips content.

### 5.4 Kanban behaviour

`NFR-RESP-003` proposes horizontal column scrolling at narrow widths. Columns are a fixed 288px
(`< bp.lg`: 260px) and scroll horizontally **within the board container only** — never causing
page-level horizontal scroll (`NFR-RESP-001`). All four stage columns are always reachable.

### 5.5 Tables and lists

Below `bp.md`, the table collapses to a stacked row: primary field on the first line, secondary
fields beneath. **No data is dropped** — only reflowed. Sorting remains available through the
column-header menu.

### 5.6 Responsive acceptance

Cannot be performed until **D-02** is resolved. This document proposes the mechanism; it does
not establish the target widths (`AC-VIS-01`, `AC-VIS-02` remain Blocked).

---

## 6. Component Specifications

Components are specified for features targeted **Working** at the initial milestone
(`docs/01_PRODUCT_REQUIREMENTS.md` §6.4). **Coming Soon features receive presentation
specifications only** — a labeled, inert surface (§6.20). Nothing here is a full implementation
design for a deferred feature.

### 6.1 Button

**Purpose.** Triggers an action.

| Variant | Use | Style |
|---|---|---|
| `primary` | One per view — the main action | `color.brand.600` fill, `color.text.inverse` label |
| `secondary` | Supporting actions | Transparent fill, `color.border.default` border |
| `ghost` | Toolbar and card actions | Transparent, no border; hover `color.bg.subtle` |
| `danger` | Destructive confirmation | `color.status.danger.text` on `color.status.danger.bg`, solid variant for the confirm action |
| `link` | Textual navigation | `color.text.brand`, no padding |

| Size | Height | Padding | Label |
|---|---|---|---|
| Compact | 32px | 12px | `type.label` |
| **Default** | 36px | 16px | `type.label` |
| Large | 44px | 20px | `type.body` |

**States.** Default · hover (`brand.700` / `bg.subtle`) · active (`brand.800` / `bg.muted`) ·
focus-visible (ring, §2.6) · disabled (`bg.muted` fill, `text.muted`, not focusable) · loading
(spinner replaces label, **width preserved**).

**Rules.** One `primary` per view. Icon-only buttons require an accessible name (§8.6) and a
tooltip (§6.10). Loading buttons **retain their width** to prevent layout shift. Disabled buttons
must state *why* via tooltip — never silently inert.

**Keyboard.** `Enter` and `Space` activate. `Tab` reaches it. Disabled buttons are skipped.

### 6.2 Input

**Purpose.** Text and numeric entry.

| Variant | Height | Use |
|---|---|---|
| Text | 36px | Titles, descriptions, names |
| Textarea | Auto, min 80px | Descriptions, comments |
| Select | 36px | Priority, assignee, stage |
| Date | 36px | Due dates |

**States.** Default (`border.default`) · hover (`border.strong`) · focus (`border.focus` + ring) ·
invalid (`border.danger` + `status.danger.text` message) · disabled · read-only (`text.secondary`,
no focus ring, still announced).

**Rules.** Validation messages sit below the field in `type.meta`, `color.status.danger.text`, and
are programmatically associated with the input (§8.5). Placeholder text is **not** a label —
every field has a persistent visible label or accessible name. Input is preserved across a failed
submission (`NFR-ERR-003`).

**Keyboard.** `Tab` in, `Shift+Tab` out. `Esc` reverts a draft where one exists.

### 6.3 Search

**Purpose.** Text search over tasks (Working). **Advanced search is Coming Soon** (§6.20).

Scoped to the **current project**, matching **task title and description**, case-insensitive,
partial match (`docs/01_PRODUCT_REQUIREMENTS.md` §5.10, resolved D-13).

| State | Presentation |
|---|---|
| Idle | Placeholder *"Search tasks…"*, `bg.subtle` fill, no border until hover |
| Typing | Value retained; results update |
| Searching | Inline spinner at the right edge; container height unchanged |
| **No results** | Panel below: *"No tasks match «query»"* + clear action (`AC-SEARCH-02`) |
| **Failure** | Error message; query preserved; **must not** appear as no-match (`AC-SEARCH-07`) |
| No query | Full, unfiltered list shown — visually distinct from no-results (`NFR-STATE-004`) |

**Rules.** Empty state and no-results state are never visually indistinguishable. No
per-character spinners — debounced, single indicator. Match location is indicated on the matched
field (`AC-SEARCH-08`).

**Keyboard.** `Ctrl`/`Cmd`+`K` focuses search (**Proposed**). `Esc` clears, then closes results.
`Arrow` keys navigate results; `Enter` opens the task drawer.

### 6.4 Select and menu

**Purpose.** Choose one value from a list, or invoke grouped actions.

Selects open a dropdown: `bg.surface`, `radius.lg`, `shadow.md`, 320px min width, 8px viewport
padding. The selected option carries a check icon and `bg.subtle`. Grouped menus use a 1px
`border.subtle` separator and an `overline` label.

**Rules.** Options are never conveyed by color alone. A select's value is always text — never a
color swatch alone. Long option lists scroll within the panel, never the page.

**Keyboard.** `Enter`/`Space`/`ArrowDown` opens. `Arrow` navigate, `Home`/`End` jump, type-ahead
selects, `Enter` commits, `Esc` closes and restores focus to the trigger.

### 6.5 Dialog and confirmation dialog

**Purpose.** Modal task requiring a decision.

| Type | Width | Padding | Use |
|---|---|---|---|
| Standard | 480px | `space.7` 24px | Create project, create task |
| Wide | 640px | `space.7` | Task creation with all fields |
| Confirmation | 440px | `space.7` | Archive, delete task |

**Style.** `bg.surface`, `radius.lg`, `shadow.lg`, scrim `bg.overlay`. Header `type.h3`, body
`type.body`, footer right-aligned with `secondary` then `primary` (or `danger` primary for
destructive confirmation).

**Rules.** **A dialog is never dismissible by clicking the scrim when it contains unsaved input.**
Confirmation dialogs state the consequence explicitly. **No permanent project-deletion control
exists anywhere** (`AC-PRJ-14`) — this dialog must not provide one. Buttons are ordered so the
safe action is the default focus.

**Keyboard.** Focus moves into the dialog on open, is **trapped** while open, and **returns to the
invoking control** on close (`NFR-ACCESS-004`). `Esc` closes. Focus never lands on a disabled
control.

### 6.6 Card

**Purpose.** Groups related content on a surface.

| Variant | Use |
|---|---|
| Default | Project card, metric tile |
| Interactive | Clickable; hover raises `border.strong` + `shadow.sm` |
| Selectable | Adds `bg.subtle` on selected |

**Style.** `bg.surface`, `border.default` 1px, `radius.lg`, `shadow.sm` at rest. Padding per §4.4.
Title `type.h3`, body `type.body`, metadata `type.meta`.

**Rules.** Cards are for grouping, not for every element. Nested cards are avoided; use dividers
(`border.subtle`) instead. A card is a single interactive target — nested clickable elements
require their own targets and stop-propagation handling.

### 6.7 Navigation and sidebar

**Purpose.** Persistent wayfinding across a workspace.

Structure: application shell → sidebar (workspace switcher, primary nav, user menu) → main
content → optional drawer.

| Element | Style |
|---|---|
| Sidebar | `bg.surface`, `border.subtle` right edge, 240px (`bp.xl`: 256px) |
| Nav item | 36px height, `radius.md`, `type.label`, icon + label |
| Nav active | `bg.brand.100` fill, `color.text.brand`, 3px left `brand.600` indicator |
| Nav hover | `bg.subtle` |
| Workspace switcher | Top of sidebar, shows current workspace; dropdown via §6.4 |

**Rules.** Exactly one nav item is active. Nav order is fixed across views. Active state uses
**fill + indicator + `type.meta`** weight — never color alone (`NFR-ACCESS-008`). The workspace
switcher lists only workspaces the user belongs to (`FR-WS-004`).

**Keyboard.** `Arrow` navigate within nav; `Home`/`End` jump. Current item carries
`aria-current="page"`.

### 6.8 Tabs

**Purpose.** Switch between views of the same data — Board, List, Archived.

| Element | Style |
|---|---|
| Container | `border.subtle` bottom edge |
| Tab | `type.label`, `padding: 12px 16px`, transparent |
| Tab active | `color.text.primary`, 2px `brand.600` bottom indicator |
| Tab hover | `color.text.secondary` |

**Rules.** Active state uses the indicator **and** weight — never color alone. Tabs do not reorder
between views. A disabled tab states why.

**Keyboard.** `Arrow` keys move, `Home`/`End` jump, with roving tabindex.

### 6.9 Badge and status indicator

**Purpose.** Compact status or metadata label.

| Variant | Style |
|---|---|
| Neutral | `status.neutral.bg` / `status.neutral.text` |
| Brand | `brand.100` / `text.brand` |
| Success / Warning / Danger / Info | Matching `color.status.*` |

**Dimensions.** Height 20px, `radius.full`, `padding: 2px 8px`, `type.meta` 500 weight.

**Rules. Critical for this product.**
- **Never colour alone** (`NFR-ACCESS-008`) — every badge carries a **text label**.
- Stage badges map exactly to the four approved stages: **Backlog**, **In Progress**,
  **In Review**, **Done** (`FR-KAN-002`, resolved D-09). Colour follows stage consistently on
  card, list row, and drawer.
- Priority badges use **High**, **Medium**, **Low**, **No priority** (`FR-TASK-010`). **No
  priority is an explicit badge**, never a blank cell.
- **Coming Soon** badges are always `neutral` with the literal text *"Coming Soon"*.
- **Archived** badge is `neutral` with the literal text *"Archived"*.
- Stage colour is an aid, never the carrier — the stage name is always present.

### 6.10 Tooltip

**Purpose.** Supplementary label for an icon-only control or truncated text.

**Style.** `bg.inverse`, `radius.sm`, `padding: 4px 8px`, `type.meta` in `text.inverse`.
`shadow.md`. Appears after 400ms hover or on focus; max 240px; wraps to 2 lines.

**Rules.** **Never the only source of essential information.** Not used for errors — validation
messages live inline. Tooltips do not appear on touch-primary widths. Where truncation occurs, the
full value is also in `title` (§3.5).

**Keyboard.** Appears on focus. `Esc` dismisses. Never contains interactive content.

### 6.11 Toast and notification

**Purpose.** Transient confirmation of a completed action.

**Style.** Bottom-right (`bp.sm`: full-width bottom), `bg.surface`, `border.default`, `radius.lg`,
`shadow.lg`, 360px wide, `padding: space.4`. Icon + `type.body` + optional action link.

| Type | Accent |
|---|---|
| Success | `status.success.text` icon |
| Danger | `status.danger.text` icon |
| Information | `text.brand` icon |

**Rules.** **Toasts confirm; they never explain.** A toast must not be the only report of a
failure — the failure state also renders inline. Auto-dismiss 5s, paused on hover or focus;
`Esc` dismisses. Live region `polite` for success, `assertive` for errors.

**Notification centre is Coming Soon** (§6.20).

### 6.12 Empty state

**Purpose.** Explains an absent collection and offers the next action (`NFR-STATE-002`).

**Layout.** Centred within the region, max-width 640px, `space.11` vertical padding. Optional 24px
single-colour icon, `type.display` headline, `type.body.lg` supporting line, one `primary` action.

**Instances.** No projects (create a project) · no tasks in a project (create a task) ·
empty workspace (create or join — join **Coming Soon**) · no search results (§6.3) · no archived
projects · no comments on a task.

**Rules.** Empty state is **never** indistinguishable from loading (`NFR-STATE-004`). It states
what is absent **and** what to do. For a project with no tasks it is **not** a zero-progress
metric (`NFR-STATE-006`, `FR-DASH-004`).

### 6.13 Loading state and skeleton

**Purpose.** Communicates that data is arriving (`NFR-STATE-003`).

**Rules.**
- **Skeletons, not spinners, for content regions** — they preserve layout and prevent shift.
- Spinners only for actions under 400ms expected duration, or inside buttons (§6.1).
- Skeleton blocks match the shape of real content.
- **An empty state is never rendered as a skeleton** — "nothing yet" and "loading" are different
  messages.
- Skeletons use `bg.muted` with a single low-opacity sweep (§9.5).

### 6.14 Error state

**Purpose.** Reports that something failed, per `NFR-ERR-001`.

**Layout.** `status.danger.bg` panel, `status.danger.text` icon, `type.body` message stating what
failed and the next action. Retry offered where retrying is meaningful (`NFR-ERR-006`).

**Rules.** A failure **never** leaves the interface showing a state that did not occur
(`NFR-ERR-002`). A failed save is never displayed as saved (`NFR-DATA-005`). Messages avoid
internal implementation detail (`NFR-ERR-007`). Announced assertively (§8.5).

### 6.15 Table and list

**Purpose.** Tabular inspection of tasks; list presentation.

**Table.** Header row: `bg.subtle`, `type.overline`, 40px. Body rows 40px, `border.subtle` bottom.
Sortable headers show a chevron; active sort uses `text.brand` **plus** `aria-sort`. Row hover
`bg.subtle`; selected row `brand.100` with a left indicator. Cell padding `space.4` horizontal.

**Rules.** Columns per `FR-LIST-002`: title, stage, priority, assignee, due date. Sort indicators
use shape and text, not colour alone. **Inline editing is Planned and not present in the
interface** (`FR-LIST-008`, resolved D-09) — **no editable affordance appears.** Rows are
keyboard-activatable and open the drawer (`AC-LIST-05`).

**Keyboard.** `Arrow` move between cells, `Home`/`End` jump. Row activation opens the drawer.

### 6.16 Kanban column and task card

**Purpose.** Present work by stage; let a user change a task's stage.

**Column.** Fixed 288px (`< bp.lg`: 260px). Header: stage name `type.label`, count badge
(`type.meta`), `space.4` padding, `border.subtle` right edge. Body scrolls; column scrolls
horizontally within the board container only (§5.4).

**Task card.** `bg.surface`, `border.default`, `radius.md`, `shadow.sm`, 12px padding. Content per
`FR-KAN-008`: title (`type.body`, 2-line clamp), priority badge, assignee (`type.meta`), due date
(`type.meta`, danger variant when overdue).

**States.** Default · hover (`shadow.md`) · dragging (elevated `shadow.lg`, slight scale ≤1.02,
reduced-motion alternative in §9.6) · drop-target (2px `brand.600` outline) · **empty column**
(explicit empty state, never a blank gap — `FR-KAN-005`).

**Rules.**
- Column order is fixed: **Backlog → In Progress → In Review → Done** (`FR-KAN-002`, resolved
  D-09).
- Cards within a column are **newest first**; no manual reordering, and no affordance implying it.
- **No column can be added, renamed, reordered, or removed** — and no control may imply otherwise
  (`FR-KAN-009`).
- An interrupted drag returns the card to its origin with no state change (`AC-KAN-07`).
- **Drag-and-drop is never the only route** (`FR-KAN-006`, `NFR-ACCESS-007`) — §8.7 defines the
  keyboard equivalent.
- With an active filter the board states how many tasks are hidden (`AC-KAN-06`).

### 6.17 Project controls

**Purpose.** Create, edit, archive, and switch projects.

| Control | Specification |
|---|---|
| Create | `primary` button in the project list header; opens standard dialog (§6.5) |
| Edit | `ghost` icon button on the project card; opens dialog with name, description, colour |
| Archive | `ghost` icon button, `danger` on hover; opens confirmation (§6.5) |
| Archived view | Tab alongside Board and List (§6.8); lists archived projects with an **Archived** badge |
| Restore | `secondary` button on each archived project row |

**Rules.**
- Archiving requires confirmation; declining leaves the project active and unchanged
  (`AC-PRJ-08`).
- **The project currently being viewed cannot be archived**; the control is disabled with a tooltip
  — *"Navigate away from this project to archive it"* (`FR-PRJ-011`, `AC-PRJ-12`).
- Archived projects leave the active list and dashboard but retain all tasks, comments, and history
  (`AC-PRJ-09`, `AC-PRJ-10`).
- **No permanent-deletion control exists anywhere** (`FR-PRJ-012`, `AC-PRJ-14`) — not disabled,
  not Coming Soon. It is simply absent.
- Colour selection uses an 8-swatch palette derived from `color.brand.*` and `color.accent.*`. **No
  purple or lavender swatch.**

### 6.18 Theme control

**Purpose.** Switch between light and dark.

**Specification.** Segmented control or single toggle in the shell header and in personal settings
(`FR-PREF-001`). Options: **Light**, **Dark**. Icon + text label in both themes.

**Rules.** Switching changes **presentation only** — never layout, data, or available actions
(`AC-THEME-03`, `FR-THEME-006`). The selection persists across reload (`FR-THEME-004`). Contrast
must hold in both (`AC-THEME-04`).

> **D-15 is `OPEN DECISION`.** The **proposed** default rule — follow the operating system
> preference on first visit, with a user override — is recorded as provisional in
> `docs/01_PRODUCT_REQUIREMENTS.md` §11.4 and is **not approved**. This document does not resolve
> it.

### 6.19 Dashboard metric surface

**Purpose.** Show derived project status (`FR-DASH-001`).

**Metric tile.** `bg.surface`, `border.default`, `radius.lg`, 20px padding. Label `type.overline`
in `text.muted`; value `type.h1` in `text.primary`, tabular numerals; supporting delta `type.meta`
in `text.secondary`.

**Rules. Critical.**
- Values are **derived from actual task data and labeled as such** — never estimates or forecasts
  (`FR-DASH-003`).
- An indicator links to the tasks behind it (`AC-DASH-05`).
- **A project with no tasks shows an empty state, never a zero-percent figure** (`FR-DASH-004`,
  `NFR-STATE-006`).
- The dashboard summarises **non-archived projects only** (`FR-DASH-002`, resolved D-19).
- Only workspaces and projects the user belongs to appear (`FR-DASH-005`, `AC-DASH-04`).
- Completion derives from the terminal **Done** stage (resolved D-09).
- **Which** metrics are displayed remains **`OPEN DECISION` D-05** and is not settled here.

### 6.20 Coming Soon and Planned surfaces

Applies to `FR-ANLYT`, `FR-ROLE`, `FR-RT`, `FR-AUTO`, `FR-TL`, `FR-INT`, `FR-NOTIF`.

**Presentation specification only.** This is not a design for a working feature.

**Rules — the honesty contract** (`docs/00_PROJECT_OVERVIEW.md` §6.3, `AC-CS-01`–`AC-CS-06`):

1. Every Coming Soon feature carries a **visible text label reading "Coming Soon"**.
2. **Every control inside is inert** — no click, no hover action, no drag.
3. **No fabricated data** — no sample metrics, mock connection states, or placeholder results
   (`AC-CS-03`).
4. Status is conveyed **in text**, never by colour or visual style alone (`NFR-ACCESS-008`).
5. A disabled-looking control is **not** an acceptable substitute — it must be labeled, and a
   dead button is a **defect**, not a Coming Soon state.
6. Coming Soon is a **deliberate deferral**. A feature labeled Coming Soon because it is *broken*
   is an incorrect state assignment (`AC-CS-05`).
7. **Planned features have no interface presence at all** (`AC-CS-06`).

Surface: `bg.surface`, `border.default`, `radius.lg`, `padding: space.8`, centred `neutral` badge,
`type.h3` feature name, `type.body` one-line description of the intended capability.

**Specifically: no permanent project-deletion control** (`FR-PRJ-012`) — Planned, no interface
presence at all.

---

## 7. Theme Behavior

### 7.1 Token mapping

Two token sets, identical keys (§2). Components reference semantic tokens and inherit the
active theme. **No component contains a hard-coded theme colour.**

| Category | Light source | Dark source |
|---|---|---|
| Canvas | `#FFFFFF` | `#141618` |
| Surface | `#FFFFFF` | `#1B1E21` |
| Subtle | `#F7F9FA` | `#22262A` |
| Primary text | `#1F2429` | `#EDEFF1` |
| Muted text | `#7A848C` | `#79838B` |
| Brand | `#16A6B5` | `#2BC4D4` |

### 7.2 Application

- **Light is the default theme.** No stored preference, no system preference → light.
- Theme is applied at the document root so there is no flash of the wrong theme.
- Theme changes apply instantly — no cross-fade (§9.6).

### 7.3 Default theme resolution — provisional

> **D-15 is `OPEN DECISION`.** The following is **Proposed**, not approved.

Follow the operating system preference on first visit; allow a user override; persist the
override. **Recorded as provisional** in `docs/01_PRODUCT_REQUIREMENTS.md` §11.4. This document
does not resolve it, and the theme control (§6.18) is specified so it works regardless of which
rule is eventually approved.

### 7.4 Parity requirements

- Every token has both values (§2.7).
- **No component renders correctly in one theme only.** `AC-VIS-03` requires that switching changes
  presentation only — not layout, data, or available actions (`AC-THEME-03`).
- Contrast holds in both themes (`AC-THEME-04`).
- Dark-theme shadows use reduced alpha (§4.7).

---

## 8. Accessibility

> **D-18 is `OPEN DECISION`.** The conformance level is **not** established. The practices in this
> section are **proposed** unless tied to an existing requirement ID, in which case they are
> **required**. No claim of conformance to any standard is made here.

### 8.1 Status of requirements in this section

| Practice | Status |
|---|---|
| Semantic structure and heading order | **Required** — `NFR-ACCESS-001` |
| Contrast | **Proposed** — level awaits **D-18** (`NFR-ACCESS-002`) |
| Full keyboard operability | **Required** — `NFR-ACCESS-003` |
| Dialog focus trap and restore | **Required** — `NFR-ACCESS-004` |
| Accessible names | **Required** — `NFR-ACCESS-005` |
| Error association | **Required** — `NFR-ACCESS-006` |
| Keyboard route for drag-and-drop | **Required** — `NFR-ACCESS-007` |
| Status not by colour alone | **Required** — `NFR-ACCESS-008` |

### 8.2 Keyboard navigation

Global conventions (**Required**, `NFR-ACCESS-003`):

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move between focusable elements |
| `Enter` / `Space` | Activate |
| `Esc` | Close dialog, menu, drawer; dismiss tooltip or toast |
| `Arrow` keys | Navigate menus, tabs, table cells, nav, card grids |
| `Home` / `End` | First / last item |
| `Ctrl`/`Cmd`+`K` | Focus search (**Proposed**) |
| `?` | Keyboard shortcuts (**Proposed**, optional) |

Focus is **never** trapped except in a modal surface, where trapping is required.

### 8.3 Focus indicators (**Required**, `NFR-ACCESS-003`)

2px `color.border.focus` ring at 2px offset, drawn **outside** the control so it is never clipped.
**Focus is never removed.** `:focus-visible` is used so pointer interaction does not show a ring
while keyboard interaction always does.

**Focus must be visible on every surface combination** — white, off-white, and charcoal — including
on primary buttons and inside dialogs.

### 8.4 Semantic structure (**Required**, `NFR-ACCESS-001`)

- One `h1` per view; no skipped levels (§3.4).
- Landmarks: `header`, `nav`, `main`, and `aside` for the drawer.
- Buttons are `button` elements. Links are `a`. A div never acts as a button.
- Current nav item carries `aria-current="page"`.
- Sortable table headers carry `aria-sort`.
- Loading and toast regions are live regions (§8.5).

**Off-screen content is not focusable.** The collapsed sidebar is removed from the tab order when
closed (§5.2).

### 8.5 Announcements and errors (**Required**, `NFR-ACCESS-006`)

| Content | Mechanism |
|---|---|
| Validation error | Associated with its input; `aria-invalid`; described via `aria-describedby` |
| Toast, success | Live region `polite` |
| Toast, error | Live region `assertive` |
| Search results count | Live region `polite` |
| Save confirmation | Live region `polite` |

**Errors are never conveyed by colour alone** and are never toast-only — the failure state also
renders inline (§6.11, §6.14).

### 8.6 Accessible names (**Required**, `NFR-ACCESS-005`)

- Every interactive control has a name describing its **purpose**, not its appearance —
  *"Archive project"*, not *"Archive"*.
- Icon-only buttons require `aria-label`.
- Truncated text keeps its full value in `title` **and** the accessible name (§3.5).
- Placeholder text is never the accessible name (§6.2).

### 8.7 Dialog focus behaviour (**Required**, `NFR-ACCESS-004`)

1. On open, focus moves to the first focusable element, or the dialog container if none.
2. Focus is **trapped** for the dialog's lifetime.
3. On close, focus **returns to the invoking control**.
4. `Esc` closes.
5. Focus never lands on a disabled control.
6. Background content is `aria-hidden` while a dialog is open.

### 8.8 Keyboard equivalent for drag-and-drop (**Required**, `NFR-ACCESS-007`, `FR-KAN-006`)

Drag-and-drop must **never** be the only route to a stage change.

**Proposed** keyboard model: focus a card, press `Space` or `Enter` to pick up, `ArrowLeft` /
`ArrowRight` to move between the four stages, `Space` or `Enter` to drop, `Esc` to cancel. A live
region announces the current stage after each move.

This model is a proposal; the **requirement** that a keyboard route exist is not.

### 8.9 Reduced motion (**Required**, `NFR-MOTION-001`–`004`)

Honour `prefers-reduced-motion: reduce`. Non-essential animation is suppressed or replaced;
functionality is never dependent on motion; **where a motion token conflicts with reduced motion,
reduced motion wins** (`NFR-MOTION-003`). Detailed rules in §9.6.

### 8.10 Contrast — pending D-18

`NFR-ACCESS-002` proposes **WCAG 2.1 AA contrast**; the conformance level awaits **D-18**.

Regardless of the level eventually approved, the following are **proposed minimums** and are
recorded here as proposals:

| Pair | Minimum | Note |
|---|---|---|
| Body text on surface | 4.5:1 | `text.primary` on `bg.surface` |
| Muted/secondary text on surface | 4.5:1 | `text.muted` used for metadata must still pass |
| Text on brand fill | 4.5:1 | White on `brand.600` in light; `text.inverse` in dark |
| Non-text UI (borders, focus ring) | 3:1 | `AGENTS.md` §16.4 |

**Focus rings must be distinguishable from adjacent colours** at every state, including against
`brand.600` fills — a cyan ring on a cyan button would fail, so focus rings use a
surface-coloured inner offset (`shadow.focus`, §4.7).

**`AC-ACCESS-02` remains Blocked by D-18** and is not satisfied by this document.

---

## 9. Motion and Interaction

### 9.1 Principles

Motion **explains change**. It does not decorate, entertain, or draw attention to itself. Where a
user does not need animation to understand a change, there is none.

### 9.2 Target environment

The design targets an **Intel UHD 630-class integrated graphics** environment. Accordingly:

- **2D only.** No 3D transforms, no perspective, no tilt, no rotation of surfaces.
- **`transform` and `opacity` only** for animation. Animating `width`, `height`, `top`, `left`,
  `box-shadow`, or `filter` triggers layout or paint on every frame and is avoided.
- No `filter: blur()` on moving elements.
- No backdrop-filter on frequently-animated surfaces.
- No continuous or looping decorative animation (§9.7).
- Shadows animate only on discrete, infrequent events.

### 9.3 Duration

| Token | Value | Use |
|---|---|---|
| `motion.instant` | 0ms | Reduced-motion replacement for optional transitions |
| `motion.fast` | 100ms | Hover, focus, colour changes |
| `motion.base` | 150ms | **Default.** Small reveals, dropdowns |
| `motion.slow` | 200ms | Dialogs, drawers, toasts |
| `motion.slower` | 280ms | Large surface transitions |

**Proposed.** Most transitions use `fast` or `base`. `slower` is rare.

### 9.4 Easing

| Token | Curve | Use |
|---|---|---|
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` | **Default.** Most transitions |
| `ease.enter` | `cubic-bezier(0, 0, 0, 1)` | Elements entering — dialogs, dropdowns, toasts |
| `ease.exit` | `cubic-bezier(0.3, 0, 1, 1)` | Elements leaving |
| `ease.linear` | `linear` | Progress only. Never for UI transitions |

**Proposed.** Enter is faster than exit so new content appears promptly while departures remain
legible.

### 9.5 Interaction patterns

| Interaction | Treatment |
|---|---|
| **Hover** | 100ms `ease.standard` on colour, border, `opacity` |
| **Focus** | Ring appears immediately — **no transition**, so focus is never delayed |
| **Press** | 100ms scale to 0.98 for primary; no transform on ghost |
| **Dialog enter** | 200ms `ease.enter`; `opacity` 0→1 with `translateY(8px)`→0 |
| **Dialog exit** | 150ms `ease.exit`; `opacity`→0 |
| **Dropdown** | 150ms `ease.enter`; `opacity` + `translateY(−4px)` |
| **Drawer** | 220ms `ease.enter`; `translateX` from edge |
| **Toast** | 200ms `ease.enter`; `translateY(12px)`→0 |
| **Loading skeleton** | Single sweep, 1200ms, **looping** — permitted as it indicates real waiting |
| **Card drag** | `transform` only; `shadow.lg` applied discretely |
| **Theme switch** | **None.** Instant (`AC-VIS-03`, `AC-THEME-03`) |

### 9.6 Reduced motion

When `prefers-reduced-motion: reduce` is set:

| Normally | Reduced-motion replacement |
|---|---|
| Dialog / drawer / dropdown translate | `opacity` fade at `motion.fast`, or **no transition** |
| Toast translate | `opacity` only |
| Card drag scale | `opacity` change only — no scale |
| Skeleton sweep | **Static** `bg.muted` block |
| Any transform | Removed |

**Functionality must remain fully operable and understandable** (`NFR-MOTION-002`), and every
motion effect has a non-motion equivalent (`NFR-MOTION-004`).

### 9.7 Prohibited motion

- No looping or continuous decorative animation (§9.2).
- No parallax, no auto-playing motion, no attention-seeking animation.
- No motion on data refresh or list updates — content updates without animation.
- No motion as the sole indicator of state change.

---

## 10. Icons and Visual Assets

### 10.1 Icon system

**Proposed.** No icon library is approved — a library choice is a technical decision (§12).

| Property | Value |
|---|---|
| Style | Outline, geometric |
| Stroke | 1.5px at 24px viewBox |
| Cap / join | Round cap, round join |
| Corner radius | Consistent with `radius.sm` (4px) |
| Fill | None by default; solid only for selected states |
| Grid | 24×24 with 2px padding |

Outlines keep icons visually lighter than the type they accompany and sit comfortably beside
Inter at `type.body`.

### 10.2 Sizing

| Token | Size | Use |
|---|---|---|
| `icon.xs` | 12px | Inline with `type.meta`, badge |
| `icon.sm` | 16px | **Default.** Inline with `type.body`, nav items |
| `icon.md` | 20px | Buttons, tabs |
| `icon.lg` | 24px | Section headers, empty states |
| `icon.xl` | 32px | Empty-state illustration |

### 10.3 Rules

- **One icon set, one stroke weight.** Mixing outline and filled styles in one view is prohibited.
- Icons are **decorative by default** (`aria-hidden`) unless they carry meaning; when meaningful,
  they are paired with text or given an accessible name.
- **No icon alone conveys status** — stage, priority, and archived state always carry text (§6.9).
- Icon-only buttons require an accessible name and a tooltip (§6.1, §6.10).

### 10.4 Avatar

**Proposed.** Initials on a `brand.100` / `accent.500` fill, `radius.full`, `type.meta` 600 weight,
24px (16px in dense lists). Unassigned state uses a muted person glyph **plus** an explicit
**"Unassigned"** label (`FR-TASK-008`).

### 10.5 Restrictions

- **No 3D illustrations, isometric art, or skeuomorphic imagery.**
- **No decorative stock photography** — it adds weight and no information in a work tool.
- **No gradient meshes or blurred colour blobs.** Flat fills only.
- **No purple or lavender in imagery or illustration.**
- Illustration is limited to simple, single-colour line marks at `icon.xl` or smaller, used only in
  empty states.
- Where an empty state needs no mark, it uses none.

---

## 11. Design Tokens

Token reference for implementation. All keys are semantic. **Values marked Proposed await
approval; none is a product decision.**

### 11.1 Naming

`category.subcategory.role` — lowercase, dot-separated. `color.text.primary`,
`space.4`, `type.body`, `motion.fast`. Tokens are referenced in CSS custom properties or an
equivalent theme object; the naming scheme is stable regardless of implementation.

### 11.2 Colour tokens

| Group | Count | Tokens |
|---|---|---|
| Brand | 5 | `600`, `700`, `800`, `100`, `200` |
| Accent | 2 | `500`, `600` |
| Background | 6 | `canvas`, `surface`, `subtle`, `muted`, `overlay`, `inverse` |
| Text | 9 | `primary`, `secondary`, `muted`, `inverse`, `brand`, `danger`, `success`, `warning`, `onAccent` |
| Border | 5 | `subtle`, `default`, `strong`, `focus`, `danger` |
| Status | 15 | `success`, `warning`, `danger`, `info`, `neutral` × `bg`/`border`/`text` (neutral: `bg`/`text`) |

### 11.3 Spacing tokens

`space.0` … `space.12` — 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px. **Approved.**

### 11.4 Radius tokens

`radius.sm` 4px · `radius.md` 6px · `radius.lg` 10px · `radius.full` 9999px. **Approved.**

### 11.5 Elevation tokens

`shadow.none`, `shadow.sm`, `shadow.md`, `shadow.lg`, `shadow.focus`. Light-theme values **Approved**;
dark-theme values **Proposed** (reduced alpha, §4.7).

### 11.6 Typography tokens

`type.display`, `type.h1`, `type.h2`, `type.h3`, `type.body.lg`, `type.body`, `type.body.sm`,
`type.label`, `type.meta`, `type.overline`. Weights 400/500/600. **Proposed** — no approved font
decision exists (§3.1).

### 11.7 Motion tokens

`motion.instant` 0ms · `motion.fast` 100ms · `motion.base` 150ms · `motion.slow` 200ms ·
`motion.slower` 280ms. Easing: `ease.standard`, `ease.enter`, `ease.exit`, `ease.linear`.
**Proposed.**

### 11.8 Layout tokens

`bp.sm` 0px · `bp.md` 768px · `bp.lg` 1024px · `bp.xl` 1280px · gutters 32/24/20/16px ·
sidebar 240/256px · drawer 320/420/480px · kanban column 288/260px. **Proposed — pending D-02.**

### 11.9 Icon tokens

`icon.xs` 12px · `icon.sm` 16px · `icon.md` 20px · `icon.lg` 24px · `icon.xl` 32px. **Proposed.**

### 11.10 Token governance

- `NFR-VIS-001`: **all** visual values come from tokens. One-off values are a defect.
- `NFR-VIS-003`: extend existing components before creating new ones.
- `AC-VIS-05`: no one-off visual values may appear outside the token set.
- A token added outside this document is a change to the design system and requires updating §11.

---

## 12. Implementation Guidance

### 12.1 Consumption

- Reference **tokens only**. A literal hex, pixel value, or duration in a component is a defect
  (`NFR-VIS-001`).
- Semantic tokens mean a component never branches on theme. If a component contains
  `if (dark)`, the abstraction has failed.
- Spacing comes from `space.*`; type from `type.*`; radii from `radius.*`; motion from `motion.*`.
- New visual needs extend a token or a component. They do not introduce a parallel system.

### 12.2 Component structure

- One component per concept, shared across views (`NFR-VIS-002`).
- Variants over separate components (§1.4).
- Extend before creating (`NFR-VIS-003`).

### 12.3 Theming

- Theme at the document root; no flash of the wrong theme.
- Tokens resolve per theme; components read tokens, never theme state.

### 12.4 Performance

- Animate `transform` and `opacity` only (§9.2).
- No continuous decorative animation (§9.7).
- Skeletons over spinners for content regions (§6.13).
- Respect `prefers-reduced-motion` (`NFR-MOTION-001`).
- Target the Intel UHD 630-class environment: lightweight, 2D, GPU-cheap.

`NFR-PERF-001` remains **Proposed**; no measured threshold exists because `docs/testing.md` does
not exist (§12).

### 12.5 What this document does not decide

**Technology is not specified here.** Framework, styling approach, build tooling, and runtime are
technical decisions belonging to documents that do not exist (§12).

| Concern | Belongs to | Status |
|---|---|---|
| Framework, styling approach, build tooling | Technical implementation | PLANNED — does not exist |
| Component structure, state, data flow | Architecture | PLANNED — does not exist |
| Measured performance thresholds | Testing | PLANNED — does not exist |

The reference to a React frontend in the task objective is a **future implementation target**, not
an approved technology decision. No framework is prescribed, and `AGENTS.md` §13 requires
authorization before any dependency is installed.

---

## 13. Design-System Acceptance Checklist

Measurable checks for implementing this system. **None is satisfied by this document.** Each must
be performed against an implementation.

### 13.1 Visual consistency

| # | Check | Passes when |
|---|---|---|
| V1 | Token usage | No literal hex, px, or duration outside the token set (`NFR-VIS-001`, `AC-VIS-05`) |
| V2 | Concept consistency | The same concept looks identical across every view (`NFR-VIS-002`) |
| V3 | Component reuse | No duplicate component for an existing concept (`NFR-VIS-003`) |
| V4 | Spacing discipline | All spacing is a multiple of `space.*` |
| V5 | Stage fidelity | Exactly four columns, fixed order, matching approved stage names (`FR-KAN-002`) |
| V6 | Priority fidelity | High/Medium/Low/No priority rendered consistently; **No priority always explicit** |
| V7 | Palette purity | No purple or lavender in any surface, state, or asset |
| V8 | No 3D | No perspective, bevel, glow, or tilt anywhere |
| V9 | No deletion control | No permanent project-deletion control in the interface (`AC-PRJ-14`) |

### 13.2 Responsive

| # | Check | Passes when |
|---|---|---|
| R1 | Supported widths | No clipping, overlap, or horizontal page scroll — **Blocked by D-02** |
| R2 | Board and drawer | Usable at every supported width — **Blocked by D-02** |
| R3 | Primary flow | Completable at the smallest supported width — **Blocked by D-02** |
| R4 | Board scrolling | Horizontal scroll contained within the board, never the page (`NFR-RESP-001`) |
| R5 | Nothing hidden | No functionality removed at any width (§5.1) |
| R6 | Table reflow | Below `bp.md`, tables stack with **no data dropped** |

### 13.3 Accessibility

| # | Check | Passes when |
|---|---|---|
| A1 | Keyboard traversal | Every journey in `docs/01_PRODUCT_REQUIREMENTS.md` §4 completes by keyboard (`AC-ACCESS-01`) |
| A2 | Focus visibility | Focus visible at every interactive stop (`AC-ACCESS-02` level pending D-18) |
| A3 | Focus retention | Ring never removed; never clipped; visible on all surfaces |
| A4 | Dialog focus | Trapped while open, restored to trigger on close (`AC-ACCESS-03`) |
| A5 | Accessible names | Every interactive control has a purpose-describing name (`AC-ACCESS-04`) |
| A6 | Error association | Validation messages programmatically tied to their control (`AC-ACCESS-05`) |
| A7 | Drag-and-drop alternative | Every stage change achievable by keyboard (`AC-ACCESS-06`, `FR-KAN-006`) |
| A8 | Reduced motion | With the preference set, all functionality operable and understood (`AC-ACCESS-07`) |
| A9 | Contrast | Meets the approved level — **Blocked by D-18** |

### 13.4 Theme parity

| # | Check | Passes when |
|---|---|---|
| T1 | Complete mapping | Every colour token defined in both themes |
| T2 | No missing values | No component renders correctly in one theme only |
| T3 | Switch is presentation-only | Layout, data, and actions unchanged by switching (`AC-VIS-03`, `AC-THEME-03`) |
| T4 | Contrast both themes | Meets the approved level in light and dark (`AC-THEME-04`) |
| T5 | Persistence | Selection survives reload (`AC-THEME-02`) |
| T6 | Default rule | Per approved **D-15** — **unresolved** |

### 13.5 Motion

| # | Check | Passes when |
|---|---|---|
| M1 | Composition | Only `transform` and `opacity` animated |
| M2 | Duration discipline | Every duration from `motion.*` |
| M3 | Focus immediacy | Focus ring appears with no transition |
| M4 | Reduced-motion equivalence | Every motion effect has a non-motion equivalent (`NFR-MOTION-004`) |
| M5 | No continuous effects | No looping decorative animation |
| M6 | Loading honesty | Skeletons for content regions; spinners only under 400ms |
| M7 | Empty vs loading | Empty state never indistinguishable from loading (`AC-DATA-07`) |

### 13.6 Performance

| # | Check | Passes when |
|---|---|---|
| P1 | No layout animation | No animation of `width`, `height`, `top`, `left`, `box-shadow`, `filter` |
| P2 | Interaction response | Responsive to input without perceptible delay — **Proposed**, no threshold (`NFR-PERF-001`) |
| P3 | Integrated graphics | Smooth on Intel UHD 630-class hardware; verified on target hardware, not inferred |
| P4 | Long lists | Scroll without degrading interaction — **Proposed** (`NFR-PERF-004`) |

### 13.7 Honesty of state

| # | Check | Passes when |
|---|---|---|
| S1 | State coverage | Every data-bearing view defines loading, empty, success, and failure (`NFR-STATE-001`) |
| S2 | Empty states | Explain what is absent and offer a next action (`NFR-STATE-002`) |
| S3 | Failure integrity | A failure never displays a state that did not occur (`NFR-ERR-002`, `NFR-DATA-04`) |
| S4 | Coming Soon labelling | All seven Coming Soon features labeled in text (`AC-CS-01`) |
| S5 | Coming Soon inertness | No control inside a Coming Soon surface performs an action (`AC-CS-02`) |
| S6 | No fabricated data | No sample metrics or mock states presented as real (`AC-CS-03`) |
| S7 | Not colour alone | Every status carries text or icon (`NFR-ACCESS-008`) |
| S8 | Deferral is deliberate | No feature labeled Coming Soon because it is broken (`AC-CS-05`) |

---

## 14. Provisional Decisions and Unresolved Items

### 14.1 Labeled proposals in this document

Every item below is a **proposal**, not an approved decision.

| Item | Section | Awaiting |
|---|---|---|
| Breakpoint values | §5.1, §11.8 | **D-02** |
| Type scale, weights, letter spacing | §3.2, §3.3, §11.6 | Design approval |
| Font stacks | §3.1 | Design approval |
| Durations and easing | §9.3, §9.4, §11.7 | Design approval |
| Icon family, stroke, sizes | §10.1, §10.2, §11.9 | Design approval |
| Dark-theme shadow values | §4.7, §11.5 | Design approval |
| Contrast minimums | §8.10 | **D-18** |
| Keyboard drag-and-drop model | §8.8 | Design approval |
| `Ctrl`/`Cmd`+`K` search shortcut | §6.3, §8.2 | Design approval |
| Avatar specification | §10.4 | Design approval |
| Additional semantic status colours | §2.5 | Design approval |

### 14.2 Open decisions this document must not resolve

| ID | Question | Effect on this document |
|---|---|---|
| **D-02** | Supported screen sizes and breakpoints | §5 and §11.8 are proposals. `AC-VIS-01`, `AC-VIS-02` remain **Blocked** |
| **D-15** | Default theme resolution | §7.3 records the system-preference proposal as provisional. Theme control works regardless |
| **D-18** | Accessibility conformance level | §8.1 separates required from proposed; §8.10 contrast levels await it. `AC-ACCESS-02` remains **Blocked** |

### 14.3 Unresolved design gaps

Recorded because this document cannot close them:

1. **Icon library and asset pipeline** — no library is approved; a technical decision (§12).
2. **Exact font licensing and hosting** — if a web font is adopted, licensing is unresolved.
3. **Dark-theme elevation strategy** — reduced-alpha shadows are proposed; validation on target
   hardware is pending.
4. **Dashboard metric set** — **`OPEN DECISION` D-05**; §6.19 specifies the surface, not the metrics.
5. **Data visualisation** — no chart specification exists. Advanced analytics is Coming Soon
   (`FR-ANLYT`); no chart component is designed here.
6. **Project colour palette** — 8 swatches are required (§6.17); exact values are **not**
   specified. They must derive from `color.brand.*` and `color.accent.*` and exclude purple.

### 14.4 Consistency with approved decisions

This document was checked against all six resolved decisions and contradicts **none**:

| Resolved | Consistency |
|---|---|
| **D-03** | No role-based UI is specified as working. Membership scoping is an enforcement concern, out of scope here. `FR-ROLE` surface specified as Coming Soon only (§6.20) |
| **D-09** | Four fixed stages in fixed order; newest-first; no manual reordering; four priority values including **No priority**; no inline list editing (§6.9, §6.15, §6.16) |
| **D-10** | Join a workspace shown as Coming Soon and visibly unavailable (§6.12, §6.17) |
| **D-11** | Empty workspace state offers create, with join labeled Coming Soon; no skip (§6.12) |
| **D-13** | Search scoped to current project, title and description, with the specified states (§6.3) |
| **D-19** | Archive confirmation, archived view, restore, no deletion control, non-destructive reclassification (§6.5, §6.17) |

---

**Final principle:** A token exists so no one has to invent a visual decision later. Where a value
is not established, this document says so rather than guessing. When in doubt, defer to
`docs/00_PROJECT_OVERVIEW.md` principle 1 — clarity over clutter — and to `AGENTS.md` §7, which
requires that nothing here be described as implemented until it is built and verified.