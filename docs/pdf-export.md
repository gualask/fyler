# PDF export and optimization

This reference documents Fyler's current document-output behavior and the reasoning behind its PDF
and raster optimization policies.

## Scope

Fyler has three output paths:

- **Create a PDF** composes selected PDF pages and imported images into one PDF.
- **Front/back documents** positions two image sources on one A4 page and writes PDF or JPEG.
- **Batch compression** optimizes each supported PDF or raster image independently.

The sections below describe shared policy first and then the behavior specific to each path.

## Goal

The export pipeline prioritizes **correct PDF output** over maximum compression.
Optimization is optional and best-effort, but it must never make the resulting
document invalid.

The implementation is intentionally split into small responsibilities:

- PDF composition builds and saves documents
- imported image handling decides how image files become PDF pages
- PDF image optimization only touches image streams already embedded in a PDF

This separation keeps the flow understandable and reduces the risk of hidden
coupling between unrelated steps.

## Create-a-PDF export path

Fyler builds the exported PDF in a single pass with an incremental composer:

- pages are appended in the exact order requested by the user
- duplicates are allowed and represented explicitly in the output
- the composer copies only the object graph that is actually referenced by the
  exported pages (content, resources, XObjects, fonts, …)
- objects coming from the same source PDF are memoized so repeated references
  are not duplicated unnecessarily in the output

This design avoids building many intermediate documents and merging them later.
The main advantage is lower peak memory and fewer structural transformations
that can accidentally drop inherited properties.

### Copying a PDF page correctly

PDF pages can inherit properties from their page tree parents. To avoid
viewer-dependent behavior and subtle rendering bugs, Fyler materializes the
effective page dictionary before copying it:

- page `Resources` are built as an effective merged view (parent resources are
  preserved, page resources override only the relevant entries)
- `MediaBox` (and related box keys when present) are materialized if inherited
- `Rotate` is materialized if inherited, then combined with the user-requested
  rotation delta

The output contains a minimal, deterministic page tree and catalog. It does not
attempt to preserve interactive structures (forms/outlines) from input PDFs.

### Imported images

Imported image files become pages directly inside the final document:

- JPEG images can use a fast path that embeds the source bitstream directly when
  no resize, explicit JPEG quality, or metadata orientation transform is required
- other imported images are decoded, optionally rotated, then encoded according
  to the selected export preset
- the page geometry is derived from the chosen fit mode (`fit`, `contain`,
  `cover`)
- the resulting image XObject and content stream are inserted into the final PDF

This keeps the image policy independent from the rest of the PDF-copy logic,
while avoiding intermediate “mini-PDF” construction for each image.

## Save strategy

Fyler saves exported PDFs with a classic, compatibility-first serializer and
compresses stream data before writing.

This is intentional. A previous attempt to use object streams / modern PDF
serialization produced files that were technically writable but not reliably
openable in real viewers such as PDFKit on macOS. The current writer is more
conservative, but it is the stable production choice.

Current rule:

- use classic save
- prune unused objects
- renumber objects
- never depend on object streams for reaching the target file size

Most meaningful size reduction comes from image handling, not from aggressive
container-level rewriting.

## Imported image files: image -> PDF policy

Imported image files and images already embedded inside PDFs are treated as two
different problems.

For imported image files, Fyler uses a dedicated policy module with three steps:

1. inspect the source image
2. decide the embed policy
3. encode the raster that becomes the page XObject

This lives outside the PDF composition module on purpose.

### Source inspection

Fyler inspects a workflow-neutral source descriptor containing the detected
format, dimensions, and alpha information. The embedding policy uses that
descriptor directly: JPEG and WebP take the lossy path, while PNG, BMP, and
other decoded formats take the conservative lossless-or-unknown path.

The policy does not try to preserve original bytes. It preserves the **content
class** of the source whenever the preset asks for conservative behavior.

### Preset behavior

Current preset policy for imported image pages:

- `Original`
  - JPEG sources are embedded as-is when no resize is required
  - lossless or unknown sources stay raw/lossless inside the PDF (except WebP)
- `Light`
  - same conservative philosophy as `Original`
  - JPEG sources are embedded as-is when no resize is required
  - lossless or unknown sources are not forced into JPEG (except WebP)
- `Balanced`
  - imported image pages default to JPEG quality 92 at a 170 DPI target
- `Compact`
  - imported image pages default to JPEG quality 92 at a 120 DPI target

WebP semantic note:

- PDFs cannot embed WebP directly.
- To avoid huge raw RGB streams (and expensive container compression work),
  WebP sources are encoded as JPEG quality 92 for the final PDF. Presets differ
  in their target DPI, not their automatic JPEG quality.

Important semantic note:

- `Original` does **not** mean "preserve the exact source bytes"
- it means "preserve the nature of the content and avoid aggressive conversion"

This avoids the previous failure mode where a JPEG source image could become a
huge raw RGB stream inside the final PDF.

### JPEG fast path

When the source image is a JPEG and no downscale, explicit quality, or metadata orientation
transform is required, Fyler embeds the original JPEG bitstream directly in the PDF image XObject
(`DCTDecode`).

This avoids:

- unnecessary decode / re-encode work
- generational quality loss

When any of those transformations is required, Fyler decodes and re-encodes.

### Alpha handling

For imported image pages, alpha is currently flattened on white before the final
PDF image is encoded.

This is a deliberate simplification:

- imported images become standalone pages
- Fyler does not currently need full PDF alpha composition for this path
- supporting `SMask` here would add substantial complexity for limited product value

This choice is acceptable for the current product shape, but it should be
revisited if Fyler later supports richer compositing scenarios.

### Target-DPI resizing for imported image pages

When `targetDpi` is set, imported image pages can be downscaled before encoding.

The target size is derived from:

- the selected image fit mode (`fit`, `contain`, `cover`)
- the resulting drawn size in PDF points
- the requested `targetDpi`

Only downscaling is performed (never upscaling).

### Rotation handling

For imported JPEG pages that take the fast path, quarter-turn rotation is applied via a PDF
transform matrix in the page content stream (without rotating pixels).

## Images already embedded in PDFs

Optimization of image streams already present in a PDF is handled separately
from the imported-image policy.

The optimizer is split into three steps:

1. analyze actual image usage in the page content streams
2. build an optimization plan
3. decode, resize and rewrite only the selected candidates

### Layout-aware resizing

The key rule is that resizing is based on **effective DPI**, not on a blind
percentage reduction.

For each image usage, Fyler measures the size at which that image is actually
drawn on the final page and derives the effective DPI from:

- source pixel dimensions
- drawn size in PDF points

This allows the optimizer to reduce only genuinely oversized images and avoid
destroying already small assets.

### Supported embedded-image scope

The optimizer currently supports these embedded PDF image cases:

- `DeviceGray`
- `DeviceRGB`
- `DeviceCMYK`
- raw streams with simple supported filters
- JPEG streams (`DCTDecode`)

It skips risky or unsupported cases, including:

- images with `Mask` or `SMask`
- unsupported filters
- unsupported bit depths
- ambiguous or risky stream structures

The optimizer never blocks export if a single candidate cannot be optimized.

### Re-encoding policy

For embedded PDF images, Fyler does not re-encode blindly.

It can:

- resize
- change output encoding
- keep the original stream if the rewritten result is not meaningfully smaller

This last rule is important. Compression work that does not materially reduce
size is discarded instead of replacing the source stream for no reason.

## Front/back document output

The front/back workflow requires both A4 regions to contain either an imported image or one selected
PDF page. A selected PDF page is first rendered to a bounded JPEG raster and registered as a
temporary source. The backend owns the authoritative portrait or landscape A4 geometry and applies
the same compression settings to both regions.

PDF output uses the positioned-image composer and the compatibility-first atomic save path. JPEG
output renders the same layout directly to one raster file. Both formats support quarter-turn source
rotation; the preview uses the same backend geometry as export.

## Batch compression

Batch compression allocates collision-safe output names before starting work and processes at most
two sources concurrently. Every source produces an independent `compressed`, `already optimized`,
`skipped`, or `failed` result.

For PDFs, the standalone optimizer applies the selected image-optimization policy, removes
unreferenced objects, renumbers the remaining object graph, and compresses eligible unfiltered
streams without changing page order. It keeps the original file unless the candidate is at least 5%
smaller. Password-protected and digitally signed PDFs are skipped.

For raster images, JPEG, PNG, static WebP, and BMP are supported. Images may keep their supported
source format or convert to JPEG; conversion flattens transparency onto the selected background.
Animated WebP is skipped. When keeping the source format, Fyler retains the original bytes if the
encoded candidate would not be meaningfully smaller.

## Presets

User-facing presets remain simple:

- `Original`
- `Light`
- `Balanced`
- `Compact`

Create-a-PDF and front/back workflows default to `Light`. Batch compression defaults to `Balanced`
and does not offer `Original`, because a batch run must have an active compression policy.

Reasoning:

- it reduces oversized content without surprising users
- it preserves content class better than `Balanced`
- it is a safer default for non-expert users

`Balanced` remains the better "shareable PDF" preset, but it is more opinionated
because it can push imported image pages toward JPEG output more aggressively.

## Why this direction

The chosen tradeoff is:

- stable export first
- optimization isolated behind well-defined boundaries
- no aggressive PDF rewriting unless compatibility is proven
- size reduction driven mainly by image handling

In other words, Fyler avoids clever PDF tricks in the hot path unless the code
is well understood, explicitly scoped, and covered by regression tests.

## Regression coverage

The export code now has regression tests around the failures that actually
happened during development:

- single-page exports must not keep unused payloads from the source PDF
- image + PDF merges must not drag the full original PDF payload
- target-DPI-only optimization must really run
- optimized PDFs must still save and reload correctly
- imported JPEGs in `Original` must stay JPEG-backed
- imported PNGs in `Balanced` must switch to JPEG as intended
- save must not rely on object streams

These tests are important because the export path is correctness-critical and
small mistakes tend to surface as either invalid PDFs or unexpectedly large
files.
