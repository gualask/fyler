# PDF export and optimization

This note documents the current export strategy in Fyler and the reasoning behind it.

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

## Export path

Fyler uses three distinct preparation paths before the final save:

### 1. PDF subset path

If consecutive pages from the same source PDF can be represented as a simple
subset, Fyler keeps a single document and removes unneeded pages.

This path also prunes image XObjects that are no longer referenced by the
remaining pages. Without that cleanup, single-page exports could still carry the
weight of images used only by deleted pages.

### 2. Single-page PDF extraction path

If the final ordering requires isolated PDF pages, Fyler prepares one-page PDF
documents and merges them later.

### 3. Image-to-PDF path

If a source item is an image file, Fyler turns it into a one-page PDF before
merge. This path is not a trivial raster dump anymore: the image is classified,
an embed policy is chosen, and the final page image is encoded accordingly.

When a single prepared document is enough, merge is skipped entirely. This keeps
files smaller and avoids unnecessary structural work.

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

Fyler classifies the source image into a simple compression class:

- `Lossy`
- `LosslessOrUnknown`

Examples:

- JPEG is treated as lossy
- WebP is sniffed to distinguish lossy vs lossless
- PNG, TIFF, BMP, GIF, ICO, QOI and similar formats are treated as
  lossless-or-unknown

The policy does not try to preserve original bytes. It preserves the **content
class** of the source whenever the preset asks for conservative behavior.

### Preset behavior

Current preset policy for imported image pages:

- `Original`
  - lossy sources stay JPEG
  - lossless or unknown sources stay raw/lossless inside the PDF
- `Light`
  - same conservative philosophy as `Original`
  - lossy sources stay JPEG with lighter recompression
  - lossless or unknown sources are not forced into JPEG
- `Balanced`
  - imported image pages default to JPEG
- `Compact`
  - imported image pages default to JPEG with more aggressive quality

Important semantic note:

- `Original` does **not** mean "preserve the exact source bytes"
- it means "preserve the nature of the content and avoid aggressive conversion"

This avoids the previous failure mode where a JPEG source image could become a
huge raw RGB stream inside the final PDF.

### Alpha handling

For imported image pages, alpha is currently flattened on white before the final
PDF image is encoded.

This is a deliberate simplification:

- imported images become standalone pages
- Fyler does not currently need full PDF alpha composition for this path
- supporting `SMask` here would add substantial complexity for limited product value

This choice is acceptable for the current product shape, but it should be
revisited if Fyler later supports richer compositing scenarios.

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

## Presets

User-facing presets remain simple:

- `Original`
- `Light`
- `Balanced`
- `Compact`

The current default is `Light`.

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

- subset exports must not keep unused image payloads
- image + PDF merges must not drag the full original PDF payload
- target-DPI-only optimization must really run
- optimized PDFs must still save and reload correctly
- imported JPEGs in `Original` must stay JPEG-backed
- imported PNGs in `Balanced` must switch to JPEG as intended
- save must not rely on object streams

These tests are important because the export path is correctness-critical and
small mistakes tend to surface as either invalid PDFs or unexpectedly large
files.
