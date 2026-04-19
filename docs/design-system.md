# Design System Notes

Fyler uses a lightweight shared UI layer built from semantic theme tokens in `src/main.css` and reusable primitives in `src/shared/ui/`.

The current extraction baseline is intentionally small. The goal is to consolidate patterns that already repeat across the app, not to introduce a large component framework.

## Shared primitives

### Dialog primitives

These classes define the common shell for overlays and modal surfaces:

- `dialog-backdrop`
- `dialog-backdrop-padded`
- `dialog-backdrop-strong`
- `dialog-backdrop-blur`
- `dialog-panel`
- `dialog-panel-bordered`

Use them for confirmation dialogs, support/update overlays, tutorial cards, and progress overlays. Keep feature-specific layout, sizing, and semantics in the consuming component.

### Panel primitives

These classes define repeated bordered surfaces used for grouped information:

- `panel-surface`
- `panel-surface-subtle`
- `panel-surface-raised`
- `panel-title`

For React consumers, prefer `PanelSurface` from `src/shared/ui/layout/PanelSurface.tsx` when a repeated bordered section needs a shared shell with either a simple title or a custom header.

Use `tone="subtle"` for inset informational sections and `tone="raised"` for more prominent surfaces.

### Action primitives

Buttons continue to live in `src/main.css` as semantic class primitives:

- `btn-primary`
- `btn-ghost`
- `btn-ghost-sm`
- `btn-icon`
- `btn-danger`

If a button intent repeats across multiple features, add it here before duplicating inline Tailwind strings.

## Extraction rules

- Extract only patterns used 3+ times with the same intent.
- Prefer semantic names over visual names.
- Keep feature-specific structure out of `shared/ui` unless multiple features need the same API.
- Let `layout`, `colorize`, and `polish` build on these primitives instead of reintroducing one-off class strings.
