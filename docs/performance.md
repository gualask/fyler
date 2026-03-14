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

File import work is parallelized in
[source_registry.rs](/Users/blazar/Dev/fyler/src-tauri/src/source_registry.rs).

`files_from_paths(...)` collects the input paths and processes them with Rayon:

- file kind detection runs per path
- PDF page counting runs per PDF
- invalid files are isolated without blocking valid ones in the same batch

This is a good place for parallelism because each file can be inspected
independently and the task is mostly I/O-bound.

### Layout-aware PDF image optimization

Embedded PDF image optimization is implemented in
[mod.rs](/Users/blazar/Dev/fyler/src-tauri/src/optimize/mod.rs) and is split
into:

1. analysis
2. plan building
3. decode / resize / rewrite

The main performance win here is not "more threads everywhere". It is avoiding
work that is not justified.

#### Analysis before rewrite

[analysis.rs](/Users/blazar/Dev/fyler/src-tauri/src/optimize/analysis.rs)
walks page content streams and records how large each image is actually drawn on
the page.

That lets the optimizer reason about effective DPI instead of relying on blind
pixel caps or fixed percentage reductions.

The benefit is twofold:

- large oversized images are reduced aggressively when appropriate
- already small or layout-appropriate images are skipped early

#### Plan gating

[plan.rs](/Users/blazar/Dev/fyler/src-tauri/src/optimize/plan.rs) decides
whether an image should be:

- resized
- re-encoded
- left untouched

This keeps expensive decode/resize/rewrite work off images that do not have a
meaningful optimization path.

The optimizer also keeps the original stream when the rewritten result does not
beat a minimum reduction threshold. This avoids paying CPU cost for output that
is not materially smaller.

#### Fast resize path

When resize is required, Fyler uses
[`fast_image_resize`](https://docs.rs/fast_image_resize/) in
[raster.rs](/Users/blazar/Dev/fyler/src-tauri/src/optimize/raster.rs).

Current characteristics:

- Lanczos3 convolution for quality-preserving downscale
- RGB, grayscale, and CMYK support
- Rayon-enabled crate features for maximum throughput on the resize path

The code does not parallelize the entire optimizer loop at the document level.
Instead, it uses a specialized resize implementation that is already optimized
for the hot path.

### Imported image files: cheap decisions before PDF construction

The `image -> pdf` path has its own performance-sensitive split in
[mod.rs](/Users/blazar/Dev/fyler/src-tauri/src/pdf_image/mod.rs):

- [descriptor.rs](/Users/blazar/Dev/fyler/src-tauri/src/pdf_image/descriptor.rs)
- [policy.rs](/Users/blazar/Dev/fyler/src-tauri/src/pdf_image/policy.rs)
- [encode.rs](/Users/blazar/Dev/fyler/src-tauri/src/pdf_image/encode.rs)

This helps performance indirectly:

- source classification is done once up front
- the embed policy is chosen before building the PDF page
- JPEG sources no longer inflate into large raw RGB payloads in `Original`

That last point is both a correctness and performance win: it reduces memory and
output-size blowups for common photo inputs.

### Conservative save path

Fyler saves PDFs with the classic writer in
[mod.rs](/Users/blazar/Dev/fyler/src-tauri/src/optimize/mod.rs).

This is not the most aggressive size optimization strategy, but it is the right
performance tradeoff for production:

- the save path is predictable
- compatibility issues do not force retries or fallbacks
- compression effort is focused on image payloads, where the gain is real

The backend intentionally does not spend extra complexity budget on PDF
container tricks that are fragile across viewers.

## Frontend

### PDF rendering happens off the main thread

PDF.js is configured with a worker in
[pdfRender.ts](/Users/blazar/Dev/fyler/src/pdfRender.ts).

This keeps page rendering work out of the UI thread, which matters for:

- scrolling long previews
- drag and drop interactions
- selection-heavy flows

### Render cache with task deduplication

[PdfCacheProvider.tsx](/Users/blazar/Dev/fyler/src/hooks/PdfCacheProvider.tsx)
maintains:

- an in-memory render cache keyed by file and render profile
- a map of in-flight page tasks
- a map of in-flight PDF document loading tasks

Important consequences:

- the same PDF page variant is not rendered twice concurrently
- PDF documents are reused across requests instead of reopened repeatedly
- releasing a file clears cached renders and destroys the associated PDF.js task

This is one of the main reasons the preview flow stays responsive even when the
same source document is referenced in multiple UI areas.

### Lazy preview rendering

Preview slots are gated by `IntersectionObserver` in
[useSlotState.ts](/Users/blazar/Dev/fyler/src/components/preview/hooks/useSlotState.ts).

Two observers are used for different purposes:

- one enables rendering only when a slot approaches the viewport
- one updates the visible-page state for the modal

This avoids eagerly rendering every preview page when the modal opens.

### Targeted memoization in page-heavy UI

Fyler uses `useMemo` and `useCallback` in the places where they remove repeated
work with clear ownership:

- file lookup maps in
  [PreviewModal.tsx](/Users/blazar/Dev/fyler/src/components/preview/PreviewModal.tsx)
  and
  [List.tsx](/Users/blazar/Dev/fyler/src/components/final-document/components/List.tsx)
- derived page counters in
  [FileList.tsx](/Users/blazar/Dev/fyler/src/components/FileList.tsx)
- reorder handlers and derived sortable items in the final document list

The goal is not blanket memoization. The goal is to keep recalculation local to
the data that actually changed.

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
- deduplicated PDF preview rendering
- lazy rendering in the preview modal

That is the intended direction going forward as well: fewer wasted operations,
clear boundaries, and performance improvements that do not make the export path
harder to reason about.
