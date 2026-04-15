# Fyler

![version](https://img.shields.io/github/package-json/v/gualask/fyler)

Desktop app for merging PDF files and images into a single PDF, built with Tauri 2.

![Fyler main window](docs/assets/fyler-main-window.png)

## Features

- Add PDF files and images (JPG, PNG, WebP, and more)
- Reorder content via drag & drop
- Select specific page ranges per document (e.g. `1-3,5,8`)
- Rotate individual pages directly from the preview
- Preview any document before exporting
- Export a single merged PDF
- Optimize output: JPEG image compression and layout-aware image downscaling
- Light / dark mode with persistent preference

## Quick Add

<table>
  <tr>
    <td valign="top" width="58%">
      <p><strong>Quick Add</strong> opens a compact, always-on-top window for fast file collection.</p>
      <p>Drag PDFs or images into it, review the files you just added, remove anything you do not want, then return to the main workspace when ready.</p>
    </td>
    <td valign="top" width="42%" align="center">
      <img src="docs/assets/fyler-quick-add.png" alt="Fyler Quick Add mode" width="280" />
    </td>
  </tr>
</table>

## Downloads

Prebuilt desktop packages are published on the
[GitHub Releases page](https://github.com/gualask/fyler/releases).

Current release targets:

- macOS Apple Silicon
- macOS Intel
- Windows
- Linux

## Getting started

**Prerequisites:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org), [pnpm](https://pnpm.io)

Start the desktop app in development mode:

```bash
pnpm install
pnpm tauri:dev
```

Build the production desktop bundle:

```bash
pnpm tauri:build
```

## Dev Fixtures

This project supports small, dev-only fixture pages under `src/dev/` so complex UI states can be
inspected in a normal browser session without mounting the live Tauri backend.

Use them when you need a deterministic way to inspect DOM structure, layout, and component behavior
with Playwright or manual debugging.

Conventions:

- keep fixtures under `src/dev/`
- register fixtures in `src/dev/index.tsx`
- expose them through the `dev` query-string parameter
- keep names minimal and scenario-based
- keep fixtures isolated from Tauri dependencies when the goal is layout or DOM inspection

Routes:

- `?dev=fixtures` opens the fixture index
- `?dev=workspace-shell` opens the initial browser-safe workspace shell fixture
- `?dev=workspace-empty` opens the empty-state workspace fixture

What belongs in git:

- fixture pages in `src/dev/`
- the small gating code needed to open them in development
- reusable mock data that makes the fixture useful

What should stay local:

- Playwright MCP output folders such as `.playwright-mcp/`
- screenshots or dumps created only for temporary inspection

On Linux, Tauri also requires system packages. The release workflow installs:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## Documentation

- [Theming](docs/theming.md)
- [Architecture](docs/architecture.md)
- [PDF export and image handling](docs/pdf-export.md)
- [Performance notes](docs/performance.md)

## License

MIT
