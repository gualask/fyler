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

Concrete gating rules:

- resizing is skipped unless effective DPI exceeds the target by at least 25 DPI
  (hysteresis avoids churn)
- resizing is skipped if the resulting image would be smaller than 256 px on its
  long side
- rewritten streams are discarded unless they are at least 12% smaller than the
  original (otherwise the original bytes are kept)

#### Fast resize path

When resize is required, Fyler uses an optimized resize backend.

Current characteristics:

- Lanczos3 convolution for quality-preserving downscale
- RGB, grayscale, and CMYK support
- parallel resize support for maximum throughput on the hot path

The code does not parallelize the entire optimizer loop at the document level.
Instead, it uses a specialized resize implementation that is already optimized
for the hot path.

### Imported image files: cheap decisions before PDF construction

The `image -> PDF` path is structured to make cheap decisions up front.

This helps performance indirectly:

- source classification is done once up front
- the embed policy is chosen before building the PDF page
- JPEG sources no longer inflate into large raw RGB payloads in `Original`

That last point is both a correctness and performance win: it reduces memory and
output-size blowups for common photo inputs.

### Conservative save path

Fyler saves PDFs with a conservative, compatibility-first writer.

This is not the most aggressive size optimization strategy, but it is the right
performance tradeoff for production:

- the save path is predictable
- compatibility issues do not force retries or fallbacks
- compression effort is focused on image payloads, where the gain is real

The backend intentionally does not spend extra complexity budget on PDF
container tricks that are fragile across viewers.

### Practical thresholds (backend)

Some numeric choices that guide performance behavior:

- effective DPI resizing: 25 DPI hysteresis above the target
- minimum resized long side: 256 px
- keep-original threshold: rewritten stream must be at least 12% smaller
- auto-JPEG trigger for large raw images: at least 128 KiB, and at least 256 px
  on the long side

When auto-JPEG is used, the default quality is chosen based on how much an image
is downscaled (more downscale → slightly lower quality), and is kept higher for
already-JPEG sources.

## Frontend

### PDF rendering happens off the main thread

PDF.js is configured to use a worker so rendering does not block the UI thread.

This keeps page rendering work out of the UI thread, which matters for:

- scrolling long previews
- drag and drop interactions
- selection-heavy flows

When a page is rasterized, it is rendered to a canvas and encoded as JPEG. The
canvas is filled with white before rendering so transparent content produces a
predictable result.

### Render cache with task deduplication

Fyler maintains:

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
