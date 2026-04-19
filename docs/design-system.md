# Design System Notes

Fyler uses a lightweight shared UI layer built from semantic theme tokens in `src/main.css` and reusable primitives in `src/shared/ui/`.

The current extraction baseline is intentionally small. The goal is to consolidate patterns that already repeat across the app, not to introduce a large component framework.

## Design context

Fyler is a desktop app for merging PDF files and images into a single PDF. It is meant for a very broad audience: people with low confidence using computers, casual home users, office workers, freelancers, students, and also more experienced users who want fast, precise control over document assembly.

The product should feel simple, precise, and quietly capable.

The UI must reduce anxiety for less technical users without becoming toy-like or vague. At the same time, it must communicate enough rigor and control that more experienced users trust it for real document work. The core workflow should feel obvious within seconds: add files, review what is included, make a few confident adjustments, and export.

Visually, Fyler should stay primarily clean and editorial, with a light premium layer. That means:

- strong hierarchy
- restrained surfaces
- deliberate spacing
- clear typography
- subtle but polished emphasis on important actions

The current light/dark system and accent behavior should remain in place. Layout, typography, and hierarchy should do most of the work before adding color or motion.

## Design principles

- Make the primary workflow obvious at first glance.
- Reduce cognitive load through clarity, not oversimplification.
- Preserve depth for expert workflows through progressive disclosure and strong component consistency.
- Use polish sparingly and intentionally: premium in finish, not flashy in expression.
- Prefer calm, trustworthy interfaces over trendy or decorative ones.

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
