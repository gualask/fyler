<p align="center">
  <img src="docs/assets/fyler-hero.png" alt="Fyler" width="620" />
</p>

<p align="center">
  <strong>Combine PDF files and images into one clean PDF.</strong><br />
  Focused on simplicity: add files, adjust the order, preview, and export.
</p>

<p align="center">
  <a href="https://github.com/gualask/fyler/releases"><img src="https://img.shields.io/github/v/release/gualask/fyler?style=flat-square" alt="Release" /></a>
  <a href="https://github.com/gualask/fyler/actions/workflows/ci.yml"><img src="https://github.com/gualask/fyler/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/gualask/fyler?style=flat-square" alt="License" /></a>
</p>

## Demo

![Fyler demo](public/fixtures/video-demo.gif)

## Features

- **Mixed inputs** — combine PDFs with common image formats such as JPG, PNG,
  WebP, TIFF, BMP, and more.
- **Page-level control** — select full documents or exact ranges like
  `1-3,5,8`, then reorder the final output with drag and drop.
- **Non-destructive edits** — rotate PDF pages or image pages while keeping the
  source files untouched.
- **Preview before export** — inspect selected pages and image layout before
  writing the final PDF.
- **Smaller output when needed** — use optional presets for JPEG compression and
  layout-aware downscaling.
- **Simple workflow** — clear labels, previews, light / dark mode, three accent colors
  <img src="docs/assets/accent-swatches.svg" alt="Indigo, teal, and blue accent colors" height="12" />,
  and a focused interface keep document assembly predictable.

## Downloads

Download the latest version from the
[GitHub Releases page](https://github.com/gualask/fyler/releases).

Available packages:

- macOS Apple Silicon and Intel
- Windows installer
- Windows standalone executable
- Linux package

<details>
<summary>Build from source</summary>

## Build from source

For development builds, install [Rust stable](https://rustup.rs),
[Node.js LTS](https://nodejs.org), and [pnpm](https://pnpm.io) via `corepack`.

```bash
corepack enable
```

On Linux, install the system packages required by Tauri:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

Start the desktop app in development mode:

```bash
pnpm install
pnpm tauri:dev
```

Build the production desktop bundle:

```bash
pnpm tauri:build
```

Build the Windows standalone executable:

```bash
pnpm tauri:build:standalone
```

The standalone build writes to `src-tauri/target/standalone`, so it stays
separate from installer/updater artifacts and is removed by
`cargo clean --manifest-path src-tauri/Cargo.toml`.

</details>

## Documentation

- [Frontend testing](docs/frontend-testing.md)
- [Theming](docs/theming.md)
- [Design system notes](docs/design-system.md)
- [Architecture](docs/architecture.md)
- [PDF export and image handling](docs/pdf-export.md)
- [Performance notes](docs/performance.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
