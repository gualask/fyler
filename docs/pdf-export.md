# PDF export and optimization

This note documents the current export strategy in Fyler and the reasoning behind it.

## Goal

The export pipeline prioritizes **correct PDF output** over maximum compression.
Optimization is treated as an optional, best-effort step that must never make the
resulting document invalid.

## Export path

Fyler uses two different strategies depending on the final page sequence:

- If the output can be represented as a simple subset of the original PDF, Fyler
  keeps that document as a single PDF and removes unneeded pages.
- If the output requires a real composition step, Fyler prepares intermediate
  documents and merges them.

When a single prepared document is enough, merge is skipped entirely. This keeps
files smaller and avoids unnecessary structural work.

## Save strategy

Fyler currently saves exported PDFs with the classic serializer (`save_to`) and
compresses stream data before writing.

This is intentional. A previous attempt to use the modern serializer
(`save_modern`) produced invalid PDFs on real-world cases, even after the page
preparation logic was fixed. The current choice is more conservative, but it is
the stable one for production output.

## Image optimization

Image optimization is isolated from the rest of export and is intentionally
conservative:

- it only handles clearly supported image streams
- it skips risky or unsupported cases
- it never blocks export because a single image could not be optimized

At the moment the supported scope is limited to simple `DeviceRGB` and
`DeviceGray` image XObjects. Complex color spaces, masks, and unsupported
filters are left untouched.

This keeps the feature easy to disable or replace without affecting the core
PDF generation path.

## Why this direction

The chosen tradeoff is:

- stable export first
- local, removable optimization logic
- modest but safe compression gains

In other words, Fyler avoids aggressive PDF rewriting unless the code path is
well understood and covered by regression tests.
