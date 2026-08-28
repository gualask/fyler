# Frontend Testing

This document covers Fyler's browser-safe frontend fixtures, how to use them with Playwright or manual inspection, and the audit map of surfaces and flows that need coverage.

## Scope

Use this document when you need to:

- inspect UI states in a normal browser session without mounting the live Tauri backend
- choose between isolated fixtures, the browser-safe runtime shell, and native Tauri checks
- audit which frontend surfaces and runtime flows need verification

## Start a frontend session

```bash
corepack enable
pnpm install
pnpm dev
```

Use `pnpm tauri:dev` when you need native windowing, OS integrations, or plugin-backed behavior.

## Choosing the right mode

| Mode | Use when |
| --- | --- |
| `?dev=fixtures` | You want the fixture index and quick navigation during UI work. |
| `?dev=<fixture>` | You need deterministic, isolated inspection of a specific component or state. |
| `?dev=runtime-app` | You want the real app shell in the browser without the Tauri runtime. |
| `?dev=workflow-create-pdf` | You want a deterministic populated Create a PDF workflow. |
| `?dev=workflow-front-back` | You want deterministic populated, empty, or horizontal front/back states. |
| `?dev=workflow-compress-files` | You want deterministic batch lifecycle and result states. |
| `?dev=workspace-shell` | You only need the static workspace frame, not a representative session. |
| `?dev=workspace-preview` | You want realistic workspace proportions and selectable sample content. |
| `pnpm tauri:dev` | You need native Tauri behavior, OS dialogs, updater flows, or platform integration checks. |

The dev surface treats the browser viewport as the Fyler window: a fixture fills the viewport, so
a browser or Playwright `resize` maps 1:1 to the rendered size and screenshots stay faithful. It
clamps to the normal window minimum and shows a warning banner below it, since smaller layouts are
not representative of production. See `src/dev/DevModeShell.tsx`.

## LLM verification contract

Prefer the `workflow-*` routes for repeatable inspection and `?dev=runtime-app` when navigation or
the browser-safe application adapter is part of the check. Workflow fixtures use repository-owned
assets and do not open system dialogs.

Every dev route exposes:

- `[data-fyler-fixture-root][data-fyler-fixture-ready="true"]` when the fixture is mounted
- `window.__FYLER_DEV_FIXTURE__` with its key, kind, expected assertions, known limitations, and
  variant URLs
- `data-fixture-last-action` on interactive workflow fixtures after a fixture-controlled action

Read the route contract before making assertions. Use accessible roles and labels for interaction;
use fixture data attributes only for readiness and action completion. The fixture catalog at
`?dev=fixtures` is the authoritative list of routes and variants.

## Fixture conventions

- keep fixtures under `src/dev/`
- register fixtures in `src/dev/index.tsx`
- expose fixtures through the `dev` query-string parameter
- keep names minimal and scenario-based
- keep fixtures isolated from Tauri dependencies when the goal is layout or DOM inspection

## Available routes

| Route | Purpose |
| --- | --- |
| `?dev=fixtures` | Opens the fixture index. |
| `?dev=runtime-app` | Mounts the real app shell with the dev browser-safe platform adapter. |
| `?dev=workflow-create-pdf` | Opens the populated Create a PDF workflow. Use `&selected=image` for the image source and `&tutorialStep=0..6` for tutorial states. |
| `?dev=workflow-front-back` | Opens the populated front/back workflow. Use `&state=empty` or `&layout=horizontal` for alternate states. |
| `?dev=workflow-compress-files` | Opens batch compression. Use `&state=ready`, `running`, `completed`, `issues`, or `empty`. |
| `?dev=workspace-shell` | Opens the technical browser-safe workspace shell baseline. |
| `?dev=workspace-preview` | Opens a realistic working-session shell with sample PDF/image assets. Use `&selected=image` to start on the image picker. |
| `?dev=workspace-empty` | Opens the empty-state workspace fixture. |
| `?dev=preview-modal` | Opens the browser-safe preview modal fixture. Use `&pages=1` for the single-page variant. |
| `?dev=support-dialog` | Opens the support dialog fixture. |
| `?dev=tutorial-overlay` | Opens the tutorial overlay fixture. Use `&step=0..6` to inspect targets. |
| `?dev=feedback-overlays` | Opens feedback overlay fixtures. Use `&view=progress`, `progress-indeterminate`, `toast-success`, or `toast-warning`. |
| `?dev=final-document` | Opens the populated final-document fixture. |
| `?dev=page-picker` | Opens the PDF page-picker fixture. Use `&mode=image` for the image panel. |
| `?dev=update-dialog` | Opens the update dialog fixture. Use `&view=installing` or `error` for alternate states. |
| `?dev=error-boundary` | Opens the app error boundary fallback fixture. Use `&message=...` to override the crash text. |

The workflow fixtures cover browser-visible state and local interaction only. Native file dialogs,
window integration, codecs, and exported-file correctness still require `pnpm tauri:dev`.

## Repo hygiene

Keep in git:

- fixture pages in `src/dev/`
- browser-safe adapter support under `src/dev/`
- the gating code needed to expose fixtures in development
- reusable mock data that makes a fixture useful

Keep local:

- Playwright MCP output folders such as `.playwright-mcp/`
- screenshots, dumps, or temporary artifacts created only for inspection

## Audit Map

This section is the coverage map for frontend review. It does not track pass or fail status. Use it as the source map from which manual or automated checklists can be derived.

### UI Surfaces

| Area | Section/Component | Access |
| --- | --- | --- |
| Dev fixtures | Index fixture | `?dev=fixtures` |
| Task home | Workflow selection | Normal app, `?dev=runtime-app` |
| Workspace | Main shell | Normal app, `?dev=runtime-app` |
| Workspace | Technical shell baseline | `?dev=workspace-shell` |
| Workspace | Empty state | Normal app with empty session, `?dev=runtime-app`, `?dev=workspace-empty` |
| Header | App header | Normal app, `?dev=runtime-app`, `?dev=workspace-shell`, `?dev=workspace-empty` |
| Header | Settings menu | Toolbar -> `Settings`, `?dev=runtime-app`, `?dev=workspace-shell` |
| Header | Theme submenu | `Settings` -> `Theme`, `?dev=runtime-app`, `?dev=workspace-shell` |
| Header | Language submenu | `Settings` -> `Language`, `?dev=runtime-app`, `?dev=workspace-shell` |
| Header | Always-on-top pin | Normal app, `?dev=runtime-app` |
| Preview | Preview modal | `Open preview`, `?dev=preview-modal` |
| Preview | Toolbar preview | Preview modal -> toolbar, `?dev=preview-modal` |
| Support | Support dialog | `Settings` -> `Report a bug`, `?dev=runtime-app`, `?dev=support-dialog` |
| Support | Report issue section | Support dialog -> report issue, `?dev=runtime-app`, `?dev=support-dialog` |
| Tutorial | Tutorial overlay | First file add, `Help`, `?dev=runtime-app`, `?dev=tutorial-overlay&step=0..6` |
| Export | Output panel | Footer workspace, `?dev=runtime-app`, `?dev=workspace-shell` |
| Export | Optimization section | Output panel -> preset, `?dev=runtime-app`, `?dev=workspace-shell` |
| Export | Advanced optimization panel | Output panel -> `Custom` preset, `?dev=runtime-app`, `?dev=workspace-shell` |
| Final document | Final list | Right workspace column, `?dev=final-document` |
| Final document | Final empty state | Right workspace column with 0 pages, `?dev=final-document` |
| Page picker | Picker placeholder | No file selected, `?dev=page-picker` |
| Page picker | PDF panel | PDF file selected, `?dev=page-picker` |
| Page picker | Image panel | Image file selected, `?dev=page-picker&mode=image` |
| Overlay | Progress modal | Loading / export progress, `?dev=feedback-overlays&view=progress` |
| Overlay | Toast | Toast success / warning / error, `?dev=feedback-overlays&view=toast-warning` |
| Updates | Update dialog | Available update or fixture, `?dev=update-dialog`, `?dev=update-dialog&view=installing` |
| Error handling | Error boundary UI | Unhandled error in the app, `?dev=error-boundary` |
| Front/back | Composition workspace | Normal app, `?dev=runtime-app`, `?dev=workflow-front-back` |
| Front/back | A4 preview and output settings | Normal app, `?dev=runtime-app`, `?dev=workflow-front-back` |
| Batch compression | Source list and settings | Normal app, `?dev=runtime-app`, `?dev=workflow-compress-files&state=ready` |
| Batch compression | Progress and per-file results | Normal app, `?dev=runtime-app`, `?dev=workflow-compress-files&state=running`, `completed`, or `issues` |

### Runtime Flows

| Area | Flow / Action | Real Trigger | Integration / Side effect |
| --- | --- | --- | --- |
| Workspace | Open files from dialog | Header / empty state -> `Add files` | `open_files_dialog`, loading, skipped-file classification |
| Workspace | Drag and drop files into app | Drag files from desktop into the window | `tauri://drag-*` events, `open_files_from_paths`, first-file selection |
| Workspace | Remove single file | File list -> `Remove file` | `release_sources` for removed file |
| Workspace | Clear full session | File list -> `Clear all` | release all sources, reset selections and composition |
| Workspace | Reorder source files | Drag within source file list | local reorder, focus, selection |
| Navigation | Open each workflow | Task home -> workflow card | active window profile and workflow-owned state |
| Navigation | Return to task home | Workflow header -> back | discard confirmation when required, source release, always-on-top reset |
| Window | Toggle always on top | Workflow header -> `Keep on top` | native `setAlwaysOnTop`, pressed state shared across workflows and cleared on return to task selection |
| Settings | Toggle theme | `Settings` -> `Theme` | theme preference persistence |
| Settings | Change accent color | `Settings` -> accent | accent persistence |
| Settings | Change language | `Settings` -> `Language` | locale persistence, text refresh |
| Settings | Restore preferences on restart | Reopen app after changing settings | `preferences.storage` load/save |
| Tutorial | Start tutorial | First file add or `Help` | active tutorial state |
| Tutorial | Skip tutorial | Tutorial -> `Skip` | `tutorialSeen` persistence |
| Tutorial | Complete tutorial | Tutorial -> `Next/Done` to the end | `tutorialSeen` persistence, no unexpected reopen |
| Page Picker | PDF select all / clear all / manual | PDF panel toolbar | page spec parsing, thumbnail/input sync |
| Page Picker | Toggle single PDF page | Click PDF thumbnail | `finalPages` mutation, checkbox consistency |
| Page Picker | Rotate PDF page | PDF thumbnail -> rotate left/right | `rotatePage`, thumbnail/preview cache invalidation |
| Page Picker | Rotate image | Image panel -> rotate left/right | image `rotatePage`, preview refresh |
| Page Picker | Open preview from page picker | Thumbnail / image -> `Open preview` | runtime preview on real imported source |
| Final document | Remove final page | Final list -> remove | final composition mutation |
| Final document | Reorder final pages | Drag inside final list | real DnD reorder without regressions |
| Final document | Move to index from preview | Preview -> select `Move to` | `moveFinalPageToIndex`, list sync |
| Final document | Rotate from preview | Preview -> rotate left/right | source edit update, related UI refresh |
| Preview | Render real imported PDF | Open preview on PDF imported through app | PDF cache, worker, page render |
| Preview | Render real imported image | Open preview on image imported through app | generated image preview bytes, rotation, fit |
| Preview | Zoom / reset / close | Preview toolbar | local state, modal close |
| Export | Cancel save dialog | `Export PDF` then cancel | `save_pdf_dialog`, loading cleanup |
| Export | Successful export | Export with valid composition | `merge_pdfs`, progress events, success toast |
| Export | Export with optimization warning | Export with image that triggers warning | diagnostics warning, warning toast |
| Export | Export error path | Merge / write error path | `showError`, clear loading, diagnostics |
| Front/back | Add image source | Front or back region -> choose/drop image | source registration and composition update |
| Front/back | Select a PDF page | Front or back region -> choose PDF | PDF page picker, raster registration, source ownership |
| Front/back | Adjust composition | Rotate, swap, or change orientation | authoritative A4 preview geometry refresh |
| Front/back | Export PDF | Output format -> PDF -> export | page-composition progress and atomic PDF write |
| Front/back | Export JPEG | Output format -> JPEG -> export | raster export and selected quality settings |
| Batch compression | Add mixed sources | Choose/drop PDFs and images | source inspection, duplicate filtering, preview loading |
| Batch compression | Choose destination | Destination -> choose folder | destination authorization |
| Batch compression | Run batch | Compression settings -> Compress | bounded parallel processing and per-file completion events |
| Batch compression | Review mixed outcomes | Completed run | compressed, already optimized, skipped, and failed result states |
| Support | Copy diagnostics | Support dialog -> `Copy diagnostics` | real clipboard |
| Support | Save diagnostics | Support dialog -> `Save diagnostics...` | `save_text_file` |
| Support | Open prefilled GitHub issue | Support dialog -> `Open GitHub issue` | `open_external_url` with prefilled URL |
| Support | Blank GitHub issue fallback | Issue body too long | base URL fallback, warning toast |
| Overlay | Runtime toast | Real success / warning events | toast mount/unmount, timing |
| Overlay | Runtime progress modal | Real file-opening / export progress | determinate and indeterminate progress |
| Updates | No update available | Normal startup | `checkForUpdate` null path |
| Updates | Update available dialog | Real available update or controlled mock | available state |
| Updates | Dismiss update | `Not now` | dismissed state |
| Updates | Download/install update | `Update` | updater plugin, progress |
| Updates | Update error | Failure during install | shown error, diagnostics |
| Error handling | Error boundary UI | Unhandled error in app | fallback UI, reload action |
