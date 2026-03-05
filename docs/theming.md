# Theming system

## Concept

Components contain no hard-coded colors and no `dark:` classes for colors.
They exclusively use semantic utility classes (`bg-ui-surface`, `text-ui-text-muted`, `bg-ui-accent`, …)
generated from CSS custom properties defined in `src/main.css`.

**Changing the theme = editing only `src/main.css`.**

---

## Architecture

```
src/main.css
├── :root { ... }          light mode values
├── .dark { ... }          dark mode values  ← only place to edit for theming
└── @theme inline { ... }  exposes variables as Tailwind utilities
```

The mechanism relies on two Tailwind 4 features:

- **`@custom-variant dark`** — activates the `dark:` variant based on the `.dark` class on `<html>` (toggled by React via `document.documentElement.classList.toggle('dark', isDark)`)
- **`@theme inline`** — registers CSS custom properties as design tokens, making them available as utilities (`bg-ui-accent`, `text-ui-text-muted`, etc.)

---

## Available tokens

### Surfaces and text

| CSS token | Tailwind utility | Typical use |
|---|---|---|
| `--ui-bg` | `bg-ui-bg` | App root background |
| `--ui-surface` | `bg-ui-surface` | Header, footer, cards, panels |
| `--ui-surface-hover` | `bg-ui-surface-hover` | Hover state on interactive elements |
| `--ui-border` | `border-ui-border` | Default borders |
| `--ui-text` | `text-ui-text` | Primary text |
| `--ui-text-secondary` | `text-ui-text-secondary` | Body text, input values |
| `--ui-text-dim` | `text-ui-text-dim` | Labels, counters, secondary text |
| `--ui-text-muted` | `text-ui-text-muted` | Placeholders, hints, faded text |

### Accent (brand color)

| CSS token | Tailwind utility | Typical use |
|---|---|---|
| `--ui-accent` | `bg-ui-accent` | Primary action buttons (e.g. "Export PDF") |
| `--ui-accent-hover` | `bg-ui-accent-hover` | Hover on primary button |
| `--ui-accent-muted` | `border-ui-accent-muted` | Selection borders, focus rings, spinner |
| `--ui-accent-soft` | `bg-ui-accent-soft` | Soft background (secondary buttons, selected row) |
| `--ui-accent-soft-hover` | `bg-ui-accent-soft-hover` | Hover on soft background |
| `--ui-accent-on-soft` | `text-ui-accent-on-soft` | Text on soft background |

---

## Changing the accent color

Accent values are defined only in `:root`. The `.dark` block overrides only
the soft variants (semi-transparent) and text-on-soft, since dark mode requires
different opacity handling.

To switch from **indigo** to **violet**, edit 6 lines in `:root`:

```css
/* before */
--ui-accent:            var(--color-indigo-600);
--ui-accent-hover:      var(--color-indigo-700);
--ui-accent-muted:      var(--color-indigo-400);
--ui-accent-soft:       var(--color-indigo-50);
--ui-accent-soft-hover: var(--color-indigo-100);
--ui-accent-on-soft:    var(--color-indigo-700);

/* after */
--ui-accent:            var(--color-violet-600);
--ui-accent-hover:      var(--color-violet-700);
--ui-accent-muted:      var(--color-violet-400);
--ui-accent-soft:       var(--color-violet-50);
--ui-accent-soft-hover: var(--color-violet-100);
--ui-accent-on-soft:    var(--color-violet-700);
```

Also update the `color-mix` lines in `.dark`:

```css
.dark {
  --ui-accent-soft:       color-mix(in srgb, var(--color-violet-500) 18%, transparent);
  --ui-accent-soft-hover: color-mix(in srgb, var(--color-violet-500) 28%, transparent);
  --ui-accent-on-soft:    var(--color-violet-300);
}
```

---

## Changing the dark theme (surfaces)

The `.dark` block controls background and text colors in dark mode.
Currently uses the **gray** palette. To switch to another palette (e.g. slate):

```css
.dark {
  --ui-bg:             var(--color-slate-900);
  --ui-surface:        var(--color-slate-800);
  --ui-surface-hover:  var(--color-slate-700);
  --ui-border:         var(--color-slate-700);
  --ui-text:           var(--color-slate-100);
  --ui-text-secondary: var(--color-slate-300);
  --ui-text-dim:       var(--color-slate-400);
  --ui-text-muted:     var(--color-slate-500);
  /* accent unchanged */
}
```

---

## Colors outside the system

Some colors remain as explicit Tailwind classes because they carry fixed semantic
meaning regardless of the active theme:

- **Red** (`red-*`) — destructive actions (Remove button, error messages)
- **White** (`text-white`) — text on solid accent backgrounds

---

## Files involved

| File | Role |
|---|---|
| `src/main.css` | All token definitions — **the only file to edit for theming** |
| `src/App.tsx` | Consumes surface and accent tokens |
| `src/components/DocumentRow.tsx` | Consumes surface and accent tokens |
| `src/components/PdfPreview.tsx` | Consumes surface and accent-muted tokens |
