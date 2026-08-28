# Design System Notes

Fyler uses a lightweight shared UI layer built from semantic theme tokens and reusable primitives in `src/shared/ui/`. `src/main.css` imports those owners as the application stylesheet entry point.

The current extraction baseline is intentionally small. The goal is to consolidate patterns that already repeat across the app, not to introduce a large component framework.

## Design context

[Product](../PRODUCT.md) owns Fyler's audience, purpose, boundaries, and brand personality. The UI
layer translates that direction into a simple, precise, and quietly capable desktop experience.

Each task should be understandable within seconds: choose a workflow, add its sources, review the
result, adjust only what is necessary, and export. The interface must reduce anxiety for less
technical users without becoming toy-like or vague, while preserving enough rigor for experienced
users to trust it with real document work.

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

### Action primitives

Buttons live in `src/shared/ui/primitives.css` as semantic class primitives:

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
