# Architecture

Fyler is a Tauri 2 desktop app with a React/Vite frontend in `src/` and a Rust backend in
`src-tauri/`. The repository is a pragmatic modular monolith: workflows own their state and
contracts, capabilities stay workflow-neutral, and runtime adapters stay at the infrastructure
boundary.

## Frontend

### Directory map

- `src/app/` — composition root, providers, app shell, global notifications, overlays, settings,
  updates, and error handling.
- `src/modules/` — workflow-owned model, application orchestration, state, wire requests, and UI.
- `src/capabilities/` — workflow-neutral source, preview, and PDF-optimization contracts.
- `src/infrastructure/` — Tauri, PDF.js, persistence, window, support, source, preview, and other
  runtime adapters.
- `src/shared/` — stable primitives only: UI, i18n, preferences, diagnostics, errors, and small
  value objects.

### Reached ownership

- `src/modules/merge/` owns the merge workspace, source-session state, page selection, edits,
  optimization settings, preview, export UI, and tutorial.
- `src/modules/task-home/` owns the task-oriented product entry.
- `src/modules/page-composition/` owns the front/back model, source lifecycle orchestration,
  PDF-page raster policy, preview/export requests, and guided workflow UI.
- `src/modules/batch-compression/` owns source selection and inspection state, per-file run state,
  compression settings, result summaries, and the batch workflow UI.
- `src/modules/support/` owns support and diagnostics UX.
- `src/capabilities/document-sources/` owns source lifecycle contracts.
- `src/capabilities/document-preview/` owns image-preview contracts and query consumers.
- `src/capabilities/application-window/` owns workflow-neutral window sizing and constraint
  operations. The app shell applies the size and minimum-size profile for the active operation and
  owns the workflow-scoped always-on-top toggle; workflows receive only its rendered control, and
  returning home clears it.
- `src/capabilities/compression-profiles/` owns the shared compression preset vocabulary used by
  merge, page composition, and batch compression.
- `src/shared/contracts/operation-progress.ts` owns the versioned cross-workflow progress envelope
  and runtime guards.
- `src/infrastructure/pdfjs/` owns PDF.js loading, rendering, and cache lifetime.
- `src/infrastructure/platform/` owns native commands, focused port implementations, preferences,
  updater, and native event subscriptions.

`AppContent` navigates between the task home and one active workflow. It mounts no workflow state
itself. Each workflow owns its providers and releases its sources when the user returns home;
editable work requires discard confirmation.

### Dependency rules

- `app` composes providers and workflows but owns no workflow state.
- `modules` do not import `app` or another workflow module. They may consume capabilities, shared
  primitives, and focused infrastructure ports/hooks needed by the workflow.
- `capabilities` may depend on shared primitives or another capability contract, but never on a
  workflow or runtime adapter.
- `infrastructure` implements focused ports and may depend on capabilities, shared primitives, and
  the port types owned by consuming modules; it does not depend on `app`.
- `shared` depends only on other stable shared primitives.
- Direct `@tauri-apps/*` imports live only under `src/infrastructure/`.
- Legacy `src/features/` and `src/infra/` paths are removed. `pnpm boundaries:check` enforces these
  rules, rejects cross-workflow imports, rejects direct Tauri imports outside infrastructure, and
  fails if a legacy path returns.

### Workspace state

The merge session uses a scoped Zustand vanilla store created by `useWorkspace` and provided only
inside `MergeWorkflow`. It owns imported files and edits, selected PDF pages, included image pages,
final-page order, and selection/focus signals. It does not own I/O side effects.

Import dialogs, protected-PDF resolution, source release, PDF preview requests, and cache cleanup
remain in application hooks or infrastructure modules. TanStack Query owns request-like image and
PDF render caches, including `blob:` URL cleanup; the PDF.js provider owns document loading tasks,
passwords, and explicit source-release cleanup.

Page composition uses an independent reducer and a workflow-scoped PDF.js cache. Confirmed PDF
pages are rendered once as 300-effective-DPI JPEG sources and registered with the backend. The
frontend presents backend layout geometry, keeps contain fit fixed, and applies one shared basic
compression preset to both regions at export.

## Backend

### Entrypoints and wiring

- `src-tauri/src/main.rs` calls `fyler_lib::run()`.
- `src-tauri/src/bootstrap/` registers plugins, managed state, and Tauri handlers.
- `src-tauri/src/interfaces/tauri/` validates inbound payloads and authorization, delegates to one
  owning module, and translates errors.

### Reached modules

- `src-tauri/src/modules/sources/` owns source import, unlock, release, and source wire contracts.
- `src-tauri/src/modules/merge/` owns merge wire contracts, export orchestration, source caching,
  and merge phase ranges.
- `src-tauri/src/modules/page_composition/` owns the fixed A4 layout contract, authoritative
  preview geometry, validation, export orchestration, and page-composition phases.
- `src-tauri/src/modules/batch_compression/` owns batch planning, collision-safe output naming,
  run/session idempotency, per-file result aggregation, and workflow contracts.
- `src-tauri/src/modules/settings/` owns settings payload sanitization and its persistence port.
- `src-tauri/src/modules/support/` owns support policy, diagnostics metadata, and its text-writer
  port.
- `src-tauri/src/capabilities/pdf/` contains workflow-neutral composition, image embedding,
  metadata, and optimization capabilities.
- `src-tauri/src/capabilities/raster_compression/` owns shared source inspection, raster decode,
  compression profiles, and standalone image compression.
- `src-tauri/src/infrastructure/source_registry/` stores imported sources, generated PDF-page
  rasters, and preview bytes behind source ports. Generated raster files are deleted on release.
- `src-tauri/src/infrastructure/filesystem/` owns source/destination authorization, collision-safe
  and atomic output commits, and support text-file writing.
- `src-tauri/src/shared/` contains stable errors and the cross-workflow operation-progress envelope.

Page composition reuses the workflow-neutral positioned-image capability and atomic output writer.
It does not import merge state or contracts.

### Progress contract

Workflow export emits the versioned `operation-progress` event. A merge payload is:

```json
{
  "version": 1,
  "operation": "merge",
  "phase": "merging-pages",
  "percentage": 0
}
```

The owning Rust module defines its phase vocabulary. Merge uses `preparing-documents`,
`merging-pages`, `optimizing-images`, and `saving`; page composition uses `validating`, `composing`,
and `saving`. The Tauri adapter owns event transport. The frontend validates version, operation,
phase, and the `0..100` integer range before mapping the payload to localized progress UI.
File-import progress remains a separate `import-progress` payload because it reports completed
files rather than an operation phase.

Batch compression reports one versioned `batch-compression-file-completed` event after each source
finishes. Its payload contains the complete per-file result, allowing the frontend to update the
running count and result row without waiting for the whole parallel batch. This stays separate from
`operation-progress` because batch work has independent outcomes rather than one shared phase.

### Boundary verification

Run `pnpm boundaries:check` for the lightweight static boundary audit. The normal CI sequence also
runs it before lint, i18n, typecheck, frontend tests/build, and Rust format, clippy, and test checks.
