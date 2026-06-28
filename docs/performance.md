# Performance in Fyler

This note documents the current performance-relevant decisions in Fyler. It is
meant to describe what the code actually does today, not past experiments or
superseded implementations.

## Scope

Fyler has two different performance domains:

- backend work during import and export
- frontend work during preview, navigation, and page-heavy UI flows

The main rule across both is the same:

- avoid unnecessary work first
- parallelize only where the boundary is simple and safe
- keep performance logic local instead of spreading it through the codebase

## Backend

### Parallel source inspection

File import work is parallelized across input paths:

- file kind detection runs per path
- PDF page counting runs per PDF
- invalid files are isolated without blocking valid ones in the same batch

This is a good place for parallelism because each file can be inspected
independently and the task is mostly I/O-bound.

Fyler intentionally caps this import parallelism to a small fixed number of
threads (currently 4). This prevents import batches from saturating the machine
and keeps the UI responsive even when many files are dropped at once.

The goal is not maximum throughput at all costs. The goal is predictable
latency and avoiding resource contention with export and preview rendering.

### Layout-aware PDF image optimization

Embedded PDF image optimization is split into:

1. analysis
2. plan building
3. decode / resize / rewrite

The main performance win here is not "more threads everywhere". It is avoiding
work that is not justified.

#### Analysis before rewrite

The analyzer walks page content streams and records how large each image is
actually drawn on the page.

That lets the optimizer reason about effective DPI instead of relying on blind
pixel caps or fixed percentage reductions.

The benefit is twofold:

- large oversized images are reduced aggressively when appropriate
- already small or layout-appropriate images are skipped early

#### Plan gating

The plan step decides whether an image should be:

- resized
- re-encoded
- left untouched

This keeps expensive decode/resize/rewrite work off images that do not have a
meaningful optimization path.

Concrete thresholds live in `src-tauri/src/optimize/plan.rs`; this document only
owns the policy: skip resize/rewrite work unless the planner can make the output
meaningfully smaller without reducing already layout-appropriate images.

#### Fast resize path

When resize is required, Fyler uses an optimized resize backend.

Current characteristics:

- Lanczos3 convolution for quality-preserving downscale
- RGB, grayscale, and CMYK support
- per-image optimization tasks are processed concurrently

The optimizer parallelizes work at the per-image level. Candidate decode/resize/rewrite
tasks are processed concurrently, while the resize implementation itself remains optimized
for the hot path.

### Imported image files: cheap decisions before PDF construction

The `image -> PDF` path is structured to make cheap decisions up front.

This helps performance indirectly:

- source classification is done once up front
- the embed policy is chosen before building the PDF page
- JPEG sources no longer inflate into large raw RGB payloads in `Original`

That last point is both a correctness and performance win: it reduces memory and
output-size blowups for common photo inputs.

### Imported image display previews

Imported images get an in-memory JPEG display preview during import. The backend
stores preview bytes in `src-tauri/src/source_registry/` and returns only those
bytes through `get_image_preview`; MIME type and dimensions are fixed by the
preview pipeline rather than sent as JSON metadata.

The preview generator keeps the hot path small: it converts decoded images to
RGB, flattens alpha on white only when needed, downsizes oversized images with
the optimized resize backend, and JPEG-encodes the result. Size and quality
constants live in `src-tauri/src/source_registry/preview.rs`.

### Conservative save path

The save path uses the compatibility-first writer described in
[PDF export](pdf-export.md). The performance consequence is that compression
effort is focused on image payloads (where the gain is real) instead of fragile
container tricks, so saving stays predictable and never retries or falls back.

### Export composition avoids intermediate documents

The incremental composer and per-source object memoization are described in
[PDF export](pdf-export.md). The performance payoff is lower peak memory: the
final PDF is built in one pass instead of materializing and merging many
intermediate one-page documents.

### Auto-JPEG for large raw images

Beyond the resize gating thresholds in [Plan gating](#plan-gating), a large raw
image is auto-encoded to JPEG when it is at least 128 KiB and at least 256 px on
its long side. The default quality scales with how much the image is downscaled
(more downscale → slightly lower quality) and stays higher for already-JPEG
sources.

## Frontend

### PDF document work uses a worker

PDF.js is configured with a bundled worker asset before documents are loaded.
That worker handles PDF loading/parsing work, but the final rasterization path
still creates an HTML canvas, asks PDF.js to paint into it, and encodes the
canvas as JPEG on the UI thread.

This split matters for:

- avoiding fake-worker fallback during PDF document processing
- keeping parsing/operator-list work away from the UI thread
- bounding the remaining UI-thread canvas cost with lazy rendering and caching

When a page is rasterized, it is rendered to a canvas and encoded as JPEG. The
canvas is filled with white before rendering so transparent content produces a
predictable result.

### PDF render cache

PDF page renders are TanStack queries keyed by source file and render profile
(page, rotation, variant, width, quality, and density). This gives the render
path request deduplication and cache subscriptions without a parallel listener
registry.

Important consequences:

- the same PDF page variant is not rendered twice concurrently
- rendered `blob:` URLs are revoked when replaced or released
- PDF documents are reused across render requests instead of reopened repeatedly
- releasing a file clears render queries and destroys the associated PDF.js task

This is one of the main reasons the preview flow stays responsive even when the
same source document is referenced in multiple UI areas.

### Imported image preview cache

Imported image UI surfaces request the backend-generated JPEG preview and turn
the returned bytes into a `blob:` URL. TanStack Query owns the frontend cache:
stable image-preview keys deduplicate concurrent requests, the preview query is
kept fresh indefinitely, and unused entries are garbage-collected on a short
window to smooth React remounts without keeping large previews around.

The query cache has explicit cleanup for generated object URLs. URLs are revoked
when preview data is replaced or when the query entry is removed. The UI falls
back to the original source URL only when no generated preview bytes are
available or preview loading fails.

### Lazy preview rendering

Preview slots are gated by `IntersectionObserver`.

Two observers are used for different purposes:

- one enables rendering only when a slot approaches the viewport
- one updates the visible-page state for the modal

This avoids eagerly rendering every preview page when the modal opens.

Concrete observer parameters (today):

- prefetch margin: 300 px
- visible-page threshold: 30% intersection

### Targeted memoization in page-heavy UI

Fyler uses `useMemo` and `useCallback` in the places where they remove repeated
work with clear ownership:

- file lookup maps in preview and list UIs
- derived page counters in file lists
- reorder handlers and derived sortable items in the final document list

The goal is not blanket memoization. The goal is to keep recalculation local to
the data that actually changed.

### Workspace state subscriptions

The workspace uses a scoped Zustand store for session state. Container-level UI
subscribes to the store with selectors, so source, composition, and focus
updates can be read from the slices that own them instead of being threaded
through the app shell as one large derived snapshot.

This is mainly a state-ownership and bug-prevention choice. The heavier
performance mechanisms remain the TanStack preview/render caches, lazy
rendering, and backend-generated image previews described above.

## What is intentionally not optimized

Some things are intentionally conservative:

- the backend does not parallelize every export step
- imported images with alpha are flattened instead of using full PDF alpha masks
- the save path prefers compatibility over maximum structural PDF compression

These are deliberate tradeoffs. They reduce complexity in the most fragile parts
of the codebase and keep performance work focused on the hotspots that matter.

## Practical summary

Today, Fyler gets most of its performance wins from:

- parallel file inspection on import
- avoiding unnecessary image rewrites
- using layout-aware image optimization
- using an optimized resize backend
- using compact backend-generated previews for imported images
- deduplicated PDF preview rendering
- lazy rendering in the preview modal

That is the intended direction going forward as well: fewer wasted operations,
clear boundaries, and performance improvements that do not make the export path
harder to reason about.
