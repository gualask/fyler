# Changelog

## 1.2.0 - 2026-08-22

### Added

- Added progress feedback while importing files.

### Improved

- Migrated final-document drag and drop to Motion for smoother page reordering.
- Added screen-reader announcements after drag-and-drop reordering.
- Updated frontend, PDF, build-tooling, and Rust dependencies.

### Fixed

- Made image inclusion reversible without removing loaded source files.

## 1.1.0 - 2026-06-29

### Added

- Support for importing password-protected PDF files.
- Single-instance behavior for the desktop app.

### Improved

- Faster and more reliable preview caching.
- Improved image preview pipeline.
- Updated PDF, image, frontend, and Tauri-related dependencies.

### Fixed

- Fixed PDF preview issues.
- Fixed image picker thumbnail controls.
- Fixed release and CI workflow issues.

## 1.0.0 - 2026-05-02

Initial public release of Fyler.

### Added

- Combine PDF files and image files into a single PDF.
- Select full PDFs or specific page ranges before export.
- Reorder the final document with drag and drop.
- Rotate PDF pages and image pages without modifying the source files.
- Preview selected pages and images before exporting.
- Optional output optimization with JPEG compression and layout-aware downscaling.
- Light and dark themes with selectable accent colors.
- Release packages for macOS, Windows, and Linux, including a Windows standalone executable.
