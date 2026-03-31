# Theming system

## Concept

Components contain no hard-coded colors and no `dark:` classes for colors.
They exclusively use semantic utility classes (`bg-ui-surface`, `text-ui-text-muted`, `bg-ui-accent`, …)
generated from CSS custom properties defined in a single stylesheet under `src/`.

**Changing the theme = editing only the theme token values.**

---

## Architecture

The theming mechanism has three layers:

- light mode values (a base token set)
- dark mode overrides (applied when a `.dark` class is present on the root element)
- a Tailwind mapping that exposes the tokens as semantic utilities (`bg-ui-*`, `text-ui-*`, `border-ui-*`)

The mechanism relies on Tailwind 4 features that (1) bind dark mode to a root
`.dark` class and (2) expose CSS custom properties as design tokens so the UI
can use semantic utilities instead of raw colors.

---

## Available tokens

### Surfaces and text

| CSS token | Tailwind utility | Typical use |
|---|---|---|
| `--ui-bg` | `bg-ui-bg` | App root background |
| `--ui-surface` | `bg-ui-surface` | Header, footer, cards, panels |
| `--ui-surface-hover` | `bg-ui-surface-hover` | Hover state on interactive elements |
| `--ui-source` | `bg-ui-source` | Source panel surface |
| `--ui-output` | `bg-ui-output` | Output panel surface |
| `--ui-border` | `border-ui-border` | Default borders |
| `--ui-border-hover` | `border-ui-border-hover` | Hover / active borders |
| `--ui-text` | `text-ui-text` | Primary text |
| `--ui-text-secondary` | `text-ui-text-secondary` | Body text, input values |
| `--ui-text-dim` | `text-ui-text-dim` | Labels, counters, secondary text |
| `--ui-text-muted` | `text-ui-text-muted` | Placeholders, hints, faded text |

### Accent (brand color)

| CSS token | Tailwind utility | Typical use |
|---|---|---|
| `--ui-accent` | `bg-ui-accent` | Primary action buttons (e.g. "Export PDF") |
| `--ui-accent-hover` | `bg-ui-accent-hover` | Hover on primary button |
| `--ui-accent-text` | `text-ui-accent-text` | Accent-colored text (icons, labels) |
| `--ui-accent-muted` | `border-ui-accent-muted` | Selection borders, focus rings, spinner |
| `--ui-accent-soft` | `bg-ui-accent-soft` | Soft background (secondary buttons, selected row) |
| `--ui-accent-soft-hover` | `bg-ui-accent-soft-hover` | Hover on soft background |
| `--ui-accent-on-soft` | `text-ui-accent-on-soft` | Text on soft background |

### Status colors

Fyler keeps a small set of semantic status tokens for UI feedback:

- danger (destructive actions and error emphasis)
- success (positive confirmation)
- warning (caution / potentially risky actions)

These tokens intentionally stay “semantic-first”: they communicate meaning
independently from the active accent palette.

---

## Changing the accent color

Fyler supports switching the accent palette without changing individual
components.

Conceptually, there are two approaches:

- **Pick a built-in palette** by applying a single accent class at the app root
  (e.g. teal/amber/blue). This updates all accent-related tokens at once.
- **Define a new palette** by providing a new group of accent token values.

Dark mode typically overrides only the “soft” accent variants and the
text-on-soft color to preserve contrast (dark UIs need different opacity
handling than light UIs).

---

## Changing the dark theme (surfaces)

The `.dark` block controls background and text colors in dark mode.
Currently uses the **gray** palette. To switch to another palette (e.g. slate):
change the dark-mode surface and text token values as a group. The goal is to
keep contrast predictable across the whole app, rather than tweaking individual
components.

---

## Colors outside the system

Some colors remain as explicit Tailwind classes because they carry fixed semantic
meaning regardless of the active theme:

- **Red** (`red-*`) — destructive actions (Remove button, error messages)
- **White** (`text-white`) — text on solid accent backgrounds

There is also one intentional “non-theme” color choice outside UI styling:

- PDF page thumbnails/previews are rasterized onto a white background before
  JPEG encoding (so transparent PDF content produces a predictable result).

---

## Where the system lives

Directory-level map (no per-file coupling intended):

- `src/` contains the theme token definitions and Tailwind token mapping
- `src/components/` consumes only semantic utilities (`bg-ui-*`, `text-ui-*`, `border-ui-*`)
- `src/preferences/` owns the persisted dark-mode preference and toggles the root `.dark` class
