# Theming System

## Concept

Fyler avoids hard-coded component colors and local `dark:` color variants for normal UI.
Most styling flows from semantic tokens defined in `src/main.css`, then consumed through:

- semantic Tailwind utilities such as `bg-ui-surface`, `text-ui-text-muted`, `border-ui-border`
- shared primitives in `src/shared/ui/`
- direct `var(--ui-...)` usage in component CSS when a feature needs a specialized visual subsystem

The rule of thumb is:

- general app UI should use semantic `ui-*` utilities
- specialized rendering layers may consume dedicated token families directly
- changing the theme should primarily mean changing token values in `src/main.css`

## Architecture

The theming mechanism has four layers:

1. `:root` defines the light-mode token set
2. `.dark` overrides the same token families for dark mode
3. `.accent-*` classes override the accent family for palette switching
4. the `@theme inline` mapping exposes many of those tokens as semantic utilities such as `bg-ui-*`, `text-ui-*`, `border-ui-*`, and `ring-ui-*`

This means most components can stay free of raw color values and free of theme-specific branching.

## Token Families

### Surfaces and text

These are the core desktop app surfaces and text colors.

| CSS token | Utility | Typical use |
|---|---|---|
| `--ui-bg` | `bg-ui-bg` | App root background |
| `--ui-surface` | `bg-ui-surface` | Primary panels, headers, cards, floating surfaces |
| `--ui-surface-subtle` | `bg-ui-surface-subtle` | Inset rows, quiet header bars, subdued chips |
| `--ui-surface-hover` | `bg-ui-surface-hover` | Hover state for neutral interactive surfaces |
| `--ui-source` | `bg-ui-source` | Source-side workspace surface and derived source gradients |
| `--ui-output` | `bg-ui-output` | Output-side workspace surface and derived output sections |
| `--ui-border` | `border-ui-border` | Default borders |
| `--ui-border-hover` | `border-ui-border-hover` | Hover or emphasis borders |
| `--ui-text` | `text-ui-text` | Primary text |
| `--ui-text-secondary` | `text-ui-text-secondary` | Body copy, control labels, medium-emphasis text |
| `--ui-text-dim` | `text-ui-text-dim` | Counters and secondary metadata |
| `--ui-text-muted` | `text-ui-text-muted` | Hints, placeholders, low-emphasis labels |

### Accent

Fyler uses two related accent groups:

- a general accent family for text, soft states, selection, and derived visuals
- a solid accent family for filled controls such as primary buttons and active toggles

| CSS token | Utility | Typical use |
|---|---|---|
| `--ui-accent` | `bg-ui-accent`, `border-ui-accent`, `text-ui-accent` | Base accent hue for derived visuals and direct accent highlights |
| `--ui-accent-hover` | `bg-ui-accent-hover` | Legacy/simple accent hover utility |
| `--ui-accent-text` | `text-ui-accent` | Accent-colored text and icon labels |
| `--ui-accent-muted` | `border-ui-accent-muted`, `ring-ui-accent-muted` | Selection borders, focus rings, spinners |
| `--ui-accent-soft` | `bg-ui-accent-soft` | Soft selected state and gentle accent surfaces |
| `--ui-accent-soft-hover` | `bg-ui-accent-soft-hover` | Hover on soft accent surfaces |
| `--ui-accent-on-soft` | `text-ui-accent-on-soft` | Text on soft accent backgrounds |
| `--ui-accent-solid` | no direct utility by convention | Filled primary controls |
| `--ui-accent-solid-hover` | no direct utility by convention | Hover for filled primary controls |
| `--ui-accent-on-solid` | no direct utility by convention | Text/icons on filled primary controls |

Notes:

- `btn-primary` and other filled controls use the `solid` trio directly in CSS.
- The soft and muted accent tokens are the normal choice for selection, hover, and focus treatments.

### Status

Fyler uses semantic status families instead of raw `red-*`, `green-*`, or `yellow-*` classes for most product UI.

Each status family contains:

- a solid token for strong emphasis
- a hover token when needed
- a soft background token
- a soft text token
- a border token

Current families:

- danger: `--ui-danger`, `--ui-danger-hover`, `--ui-danger-soft`, `--ui-danger-soft-text`, `--ui-danger-border`
- success: `--ui-success`, `--ui-success-soft`, `--ui-success-soft-text`, `--ui-success-border`
- warning: `--ui-warning`, `--ui-warning-soft`, `--ui-warning-soft-text`, `--ui-warning-border`

These map to utilities such as:

- `bg-ui-danger`, `bg-ui-danger-soft`
- `text-ui-danger`, `text-ui-danger-soft-text`
- `border-ui-danger-border`

and the equivalent success/warning variants.

### Document kind

These tokens provide stable visual distinction between PDFs and images.

| CSS token | Utility | Typical use |
|---|---|---|
| `--ui-kind-pdf` | `text-ui-kind-pdf`, `bg-ui-kind-pdf` | PDF file/page indicators |
| `--ui-kind-image` | `text-ui-kind-image`, `bg-ui-kind-image` | Image file/page indicators |

### Overlay tokens

Fyler has a dedicated overlay token family for preview chrome and thumbnail quick actions.

These tokens are part of the theme system, but they are usually consumed through `var(--ui-overlay-...)`
inside feature CSS or inline styles rather than generic Tailwind utilities.

Current overlay tokens:

- `--ui-overlay-border`
- `--ui-overlay-control-hover`
- `--ui-overlay-control-strong`
- `--ui-overlay-control-strong-hover`
- `--ui-overlay-text`
- `--ui-overlay-text-muted`
- `--ui-overlay-scrim`
- `--ui-overlay-shadow`
- `--ui-overlay-shadow-muted`

This family exists because preview chrome needs a different contrast model than standard app surfaces.
The current overlay tokens are intentionally stable across light and dark mode so the preview controls
keep the same visual behavior regardless of the app shell theme.

### Output fit preview tokens

The export panel preview uses its own token family for miniature page-fit illustrations.

Current fit preview tokens:

- `--ui-fit-preview-page`
- `--ui-fit-preview-page-shadow`
- `--ui-fit-preview-media-highlight`
- `--ui-fit-preview-media-end`
- `--ui-fit-preview-media-shadow`
- `--ui-fit-preview-frame-border`

These are specialized implementation tokens and are mainly consumed from feature CSS.

### Internal UI infrastructure tokens

Some token families support implementation details rather than direct component styling APIs:

- scrollbar: `--ui-scrollbar-thumb`, `--ui-scrollbar-thumb-hover`
- shadows: `--ui-shadow-panel`, `--ui-shadow-float`, `--ui-shadow-soft`

These are still part of the theme system. They just are not intended as first-choice application-level utilities.

## Accent Palette Switching

Fyler supports accent switching by applying a single accent class at the app root, such as:

- `accent-indigo`
- `accent-teal`
- `accent-amber`
- `accent-blue`

An accent palette must override the whole accent family coherently, including:

- base accent
- soft accent
- text accent
- muted accent
- solid accent

Dark mode usually overrides only the soft/text-oriented accent tokens to preserve contrast, while keeping the filled control model stable.

## Dark Theme

The `.dark` block overrides the same token families as light mode.
Dark mode should be adjusted by changing tokens as a group, not by tweaking individual components.

In practice this means:

- surfaces and text shift together
- status tokens shift together
- fit-preview tokens get their own dark tuning

Overlay tokens are currently shared across light and dark mode by design. Add dark-specific overlay
overrides only if the preview chrome develops a real contrast problem that cannot be solved by the
stable overlay palette.

## Colors Outside the System

Fyler still allows a small set of deliberate exceptions.

### Allowed exceptions

- high-contrast neutral preview shells or backdrops such as `bg-black/40` or `bg-zinc-900`
- small image-bound overlay text and chrome such as `text-white/90`, `bg-black/55`, or `hover:bg-white/10`
- `text-white` on solid accent or destructive backgrounds
- platform-limited native select option text when browser rendering does not respect the overlay palette
- the white raster background used when rendering PDF previews/export intermediates

### Not the default approach

These exceptions should stay contained to specialized rendering layers.
For normal app UI, prefer semantic `ui-*` tokens instead of raw Tailwind colors.

Also note:

- raw `red-*` utilities are not the current standard for product UI status styling
- semantic `ui-danger`, `ui-success`, and `ui-warning` tokens are the preferred path

## Usage Rules

- Prefer semantic `bg-ui-*`, `text-ui-*`, `border-ui-*`, and `ring-ui-*` utilities in components.
- Prefer shared primitives such as `btn-*`, `panel-*`, and dialog classes when the intent already exists.
- Use direct `var(--ui-...)` access when a feature has a specialized token family that is not meant to become a generic utility API.
- Avoid local `dark:` color branches for normal theme behavior.
- If a new visual intent repeats, promote it into the token system instead of hard-coding values in multiple components.

## Where the System Lives

- `src/main.css` defines token values, dark overrides, accent palette overrides, and the Tailwind mapping
- `src/shared/ui/` contains shared primitives that consume the semantic utilities
- `src/features/**/components/` consume the utilities directly or use feature-scoped CSS backed by `var(--ui-...)`
- `src/shared/preferences/` owns persisted theme preferences and toggles the root `.dark` class
