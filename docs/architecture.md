# Architecture

Fyler is a Tauri 2 desktop app:

- **Frontend**: React + Vite UI under `src/`
- **Backend**: Rust/Tauri commands under `src-tauri/`

The goal of the structure is “feature-first” on the frontend, with a small and explicit Rust surface area on the backend.

## Frontend

### Directory map

- `src/main.tsx` — Web entrypoint.
- `src/app/` — Composition root and app shell (providers, layout, global overlays).
- `src/features/` — User workflows, grouped by feature.
- `src/shared/` — Cross-cutting modules with stable contracts (domain, i18n, diagnostics, preferences, UI primitives).
- `src/infra/` — Technical integrations and side effects (Tauri bridge, PDF rendering/caching, other plumbing).

### Feature ownership (where to look)

- `src/features/workspace/` — Imported sources and session state.
- `src/features/page-picker/` — Selecting/rotating pages and per-source controls.
- `src/features/final-document/` — Ordering/removing pages in the final composition.
- `src/features/export/` — Export action and optimization settings UI.
- `src/features/preview/` — Preview UX and rendering helpers.
- `src/features/support/` — Support/diagnostics UX.
- `src/features/tutorial/` — Tutorial overlay UX.

### Dependency rules

- `src/shared/` must not depend on `src/features/` or `src/app/`.
- `src/infra/` may depend on `src/shared/`, but must not depend on `src/features/`.
- `src/features/` may depend on `src/shared/` and `src/infra/`, but must not depend on `src/app/`.
- `src/app/` may depend on everything (it wires the graph), but should keep business logic minimal.

## Backend

### Entrypoints and wiring

- `src-tauri/src/main.rs` — Native entrypoint; calls `fyler_lib::run()`.
- `src-tauri/src/lib.rs` — Tauri builder: registers plugins, managed state, and the command handler list.

### Command surface (frontend ↔ backend)

`src-tauri/src/commands.rs` defines the Tauri commands used by the frontend:

- import files (dialog or filesystem paths)
- release imported sources
- export the merged PDF (emits `"merge-progress"` events)
- compute single-image export preview layout
- load/save persisted settings
- open external URLs and expose basic app metadata

### Core modules

- `src-tauri/src/models.rs` — Serializable request/response payloads shared with the frontend.
- `src-tauri/src/source_registry/` — In-memory registry of imported sources (ID → path/name/kind), used by export so the frontend does not resend full metadata.
- `src-tauri/src/export.rs` — Export orchestration: compose pages, optionally optimize embedded images, then save.
- `src-tauri/src/pdf_compose/` — PDF composition primitives (`PdfComposer`) for copying PDF pages and appending image pages.
- `src-tauri/src/pdf_image/` — Image decoding + embedding policy for imported image files (flatten alpha, JPEG vs raw RGB).
- `src-tauri/src/optimize/` — Embedded PDF image optimization pipeline (analyze usage → plan → rewrite), with non-fatal failures by design.
- `src-tauri/src/pdf/` — Small PDF/image helper API used by import/export (kind detection, page counting, rotation helpers, image export layout).
- `src-tauri/src/settings.rs` — Persisted settings via `tauri-plugin-store` with input sanitization.
- `src-tauri/src/error.rs` — Stable error payload shaping for the frontend (`{ code, message, meta }`).
