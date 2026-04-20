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
| `?dev=workspace-shell` | You only need the static workspace frame, not a representative session. |
| `?dev=workspace-preview` | You want realistic workspace proportions and selectable sample content. |
| `pnpm tauri:dev` | You need native Tauri behavior, OS dialogs, updater flows, or platform integration checks. |

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
| `?dev=workspace-shell` | Opens the technical browser-safe workspace shell baseline. |
| `?dev=workspace-preview` | Opens a realistic working-session shell with sample PDF/image assets. Use `&selected=image` to start on the image picker. |
| `?dev=workspace-empty` | Opens the empty-state workspace fixture. |
| `?dev=preview-modal` | Opens the browser-safe preview modal fixture. Use `&pages=1` for the single-page variant. |
| `?dev=quick-add` | Opens the browser-safe quick-add fixture. |
| `?dev=support-dialog` | Opens the support dialog fixture. Use `&mode=about` for about mode. |
| `?dev=tutorial-overlay` | Opens the tutorial overlay fixture. Use `&step=0..3` to inspect targets. |
| `?dev=feedback-overlays` | Opens feedback overlay fixtures. Use `&view=progress`, `progress-indeterminate`, `toast-success`, or `toast-warning`. |
| `?dev=final-document` | Opens the populated final-document fixture. |
| `?dev=page-picker` | Opens the PDF page-picker fixture. Use `&mode=image` for the image panel. |
| `?dev=update-dialog` | Opens the update dialog fixture. Use `&view=installing` or `error` for alternate states. |
| `?dev=error-boundary` | Opens the app error boundary fallback fixture. Use `&message=...` to override the crash text. |

## Playwright and manual audit workflow

- use `?dev=<fixture>` when you need deterministic DOM, layout, and visual inspection
- use `?dev=runtime-app` for browser-based audit of the real shell without Tauri
- use `?dev=workspace-preview` when proportions and mixed PDF/image states matter more than isolated components
- use `pnpm tauri:dev` for native Tauri and OS-integrated checks that browser-safe fixtures cannot cover

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
| Workspace | Main shell | Normal app, `?dev=runtime-app` |
| Workspace | Technical shell baseline | `?dev=workspace-shell` |
| Workspace | Empty state | Normal app with empty session, `?dev=runtime-app`, `?dev=workspace-empty` |
| Header | App header | Normal app, `?dev=runtime-app`, `?dev=workspace-shell`, `?dev=workspace-empty` |
| Header | Settings menu | Toolbar -> `Settings`, `?dev=runtime-app`, `?dev=workspace-shell` |
| Header | Theme submenu | `Settings` -> `Theme`, `?dev=runtime-app`, `?dev=workspace-shell` |
| Header | Language submenu | `Settings` -> `Language`, `?dev=runtime-app`, `?dev=workspace-shell` |
| Quick Add | Quick Add view | Toolbar -> `Quick Add`, `?dev=runtime-app`, `?dev=quick-add` |
| Preview | Preview modal | `Open preview`, `?dev=preview-modal` |
| Preview | Toolbar preview | Preview modal -> toolbar, `?dev=preview-modal` |
| Support | Support dialog | `Settings` -> `Report a bug`, `?dev=runtime-app`, `?dev=support-dialog` |
| Support | About section | `Settings` -> `About Fyler`, `?dev=runtime-app`, `?dev=support-dialog&mode=about` |
| Support | Report issue section | Support dialog -> report issue, `?dev=runtime-app`, `?dev=support-dialog` |
| Tutorial | Tutorial overlay | First file add, `Help`, `?dev=runtime-app`, `?dev=tutorial-overlay&step=0..3` |
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

### Runtime Flows

| Area | Flow / Action | Real Trigger | Integration / Side effect |
| --- | --- | --- | --- |
| Workspace | Open files from dialog | Header / empty state -> `Add files` | `open_files_dialog`, loading, skipped-file classification |
| Workspace | Drag and drop files into app | Drag files from desktop into the window | `tauri://drag-*` events, `open_files_from_paths`, first-file selection |
| Workspace | Remove single file | File list -> `Remove file` | `release_sources` for removed file |
| Workspace | Clear full session | File list -> `Clear all` | release all sources, reset selections and composition |
| Workspace | Reorder source files | Drag within source file list | local reorder, focus, selection |
| Quick Add | Enter Quick Add mode | Toolbar -> `Quick Add` | window resize, always-on-top, quick add state |
| Quick Add | Exit Quick Add mode | `Done` / close quick add | restore window state and workspace state |
| Quick Add | Remove file in Quick Add | Quick add list -> `Remove` | session mutation, count consistency |
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
| Preview | Render real imported image | Open preview on image imported through app | `convertFileSrc`, rotation, fit |
| Preview | Zoom / reset / close | Preview toolbar | local state, modal close |
| Export | Cancel save dialog | `Export PDF` then cancel | `save_pdf_dialog`, loading cleanup |
| Export | Successful export | Export with valid composition | `merge_pdfs`, progress events, success toast |
| Export | Export with optimization warning | Export with image that triggers warning | diagnostics warning, warning toast |
| Export | Export error path | Merge / write error path | `showError`, clear loading, diagnostics |
| Support | Real about dialog | `Settings` -> `About Fyler` | `getAppMetadata`, runtime content |
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
