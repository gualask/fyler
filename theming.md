# Theming — Fyler

## Core principle

Components never contain hardcoded colors or `dark:` classes.
Changing the theme = editing only the CSS values in `src/main.css`.

---

## Semantic tokens (`src/main.css` → `:root` / `.dark`)

| CSS token | Purpose |
|---|---|
| `--ui-bg` | App background |
| `--ui-surface` | Panel / card background |
| `--ui-surface-hover` | Neutral hover on surfaces |
| `--ui-source` | Source panel background |
| `--ui-output` | Output panel background |
| `--ui-border` | Generic borders |
| `--ui-border-hover` | Borders on hover |
| `--ui-text` | Primary text |
| `--ui-text-secondary` | Secondary text |
| `--ui-text-dim` | Dimmed text |
| `--ui-text-muted` | Muted text (labels, hints) |
| `--ui-accent` | Brand color (indigo) |
| `--ui-accent-hover` | Accent on hover |
| `--ui-accent-muted` | Desaturated accent |
| `--ui-accent-soft` | Light accent background (selection, badges) |
| `--ui-accent-soft-hover` | Light accent background on hover (more saturated) |
| `--ui-accent-on-soft` | Accent text on soft background |

All tokens are exposed as Tailwind utilities via `@theme inline`:
```
bg-ui-accent      text-ui-text-muted      border-ui-border      ...
```

---

## Component classes (`@layer components`)

Defined in `src/main.css`. Use only semantic tokens — no hardcoded values.

### Buttons

| Class | Usage |
|---|---|
| `.btn-primary` | Primary action (e.g. "Export PDF") |
| `.btn-ghost` | Secondary action with border (e.g. "Preview") |
| `.btn-icon` | Borderless icon button (e.g. theme toggle) |

### Toggles and Segmented Controls

| Class | Usage | Context |
|---|---|---|
| `.toggle-on` | Active state of a toggle button (e.g. "All") | Normal background |
| `.toggle-off` | Inactive state — hover: accent soft-hover + accent/30 border | Normal background |
| `.segment-on` | Active option in a segmented control | Dark container (`slate-100` / `zinc-800`) |
| `.segment-off` | Inactive option — hover: accent soft-hover + accent-on-soft text | Dark container |

> **Hover rationale**: both toggles and segments use `bg-ui-accent-soft-hover` rather than the
> lighter `bg-ui-accent-soft` because their container already has a non-white background. The
> stronger tint visually anticipates the accent fill of the active state ("where the color will go").

### Misc

| Class | Usage |
|---|---|
| `.input-base` | Standard text input (38px height, border, accent focus ring) |
| `.label-caps` | 10px bold uppercase label with wide tracking |
| `.panel-header` | Panel header with bottom border |

---

## Changing the brand color

Edit only the `--ui-accent*` variables in `:root` and `.dark`:

```css
:root {
  --ui-accent:            #6366f1;  /* ← change here */
  --ui-accent-hover:      #4f46e5;
  --ui-accent-muted:      #a5b4fc;
  --ui-accent-soft:       #eef2ff;
  --ui-accent-soft-hover: #e0e7ff;
  --ui-accent-on-soft:    #4338ca;
}

.dark {
  --ui-accent-muted:      #818cf8;
  --ui-accent-soft:       rgba(99,102,241,0.15);
  --ui-accent-soft-hover: rgba(99,102,241,0.25);
  --ui-accent-on-soft:    #a5b4fc;
}
```

`--ui-accent` and `--ui-accent-hover` are shared across both modes — override them in `.dark`
only if a different shade is needed in dark mode.
