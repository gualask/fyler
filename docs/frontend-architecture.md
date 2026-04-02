# Frontend Architecture (Feature-first)

Fyler’s frontend is organized to make it easy to answer:

> “Where is feature X? Which code should I touch?”

The repository is structured around **user workflows** (features), with explicit **app shell**, **shared cross‑cutting building blocks**, and **technical integrations**.

## Directory Map

- `src/app/` — Composition root and app shell.
  - Owns global layout and orchestration (providers, shell UI, global overlays).
- `src/features/` — Product features, grouped by workflow.
  - Each feature owns its UI and its feature-specific logic.
- `src/shared/` — Cross-cutting modules with stable contracts.
  - Pure domain logic, i18n, diagnostics, preferences, UI primitives.
- `src/infra/` — Technical integrations and side effects.
  - Native bridge (Tauri), PDF rendering/caching, other “plumbing”.

## Feature Ownership (where to look)

- `features/workspace` — Imported sources and the “working session” state.
- `features/page-picker` — Selecting/rotating pages and per-source controls.
- `features/final-document` — Ordering/removing pages in the final composition.
- `features/export` — Export action and optimization settings UI.
- `features/preview` — Preview UX and preview rendering helpers.
- `features/support` — Support/diagnostics UX.
- `features/tutorial` — Tutorial overlay and related UX.

## Dependency Rules (keep it predictable)

- `shared` must not depend on `features` or `app`.
- `infra` may depend on `shared`, but must not depend on `features`.
- `features` may depend on `shared` and `infra`, but must not depend on `app`.
- `app` may depend on everything (it wires the graph), but should contain minimal “business” logic.

## Practical Guideline

If you’re implementing a new user-facing behavior, start in `features/<feature-name>`.
If you’re changing a cross-cutting contract (types, diagnostics, preferences), start in `shared`.
If you’re touching Tauri/PDF rendering/caching, start in `infra`.
