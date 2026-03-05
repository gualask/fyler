# Fyler

![version](https://img.shields.io/github/package-json/v/gualask/fyler)
![build](https://img.shields.io/github/actions/workflow/status/gualask/fyler/build.yml)

Desktop app for merging and rearranging PDF files, built with Tauri 2.

## Features

- Add multiple PDF files and reorder them via drag & drop
- Select specific page ranges per document (e.g. `1-3,5,8`)
- Preview any document before exporting
- Export a single merged PDF
- Light / dark mode with persistent preference

## Tech stack

| Layer | Technology |
|---|---|
| Shell | [Tauri 2](https://tauri.app) (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 4 |
| PDF (frontend) | pdf.js |
| PDF (backend) | lopdf |
| Settings | tauri-plugin-store |

## Getting started

**Prerequisites:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org), [pnpm](https://pnpm.io)

```bash
pnpm install
pnpm tauri dev
```

To build a production bundle:

```bash
pnpm tauri build
```

## Project structure

```
src/                   React frontend
├── components/        UI components
├── platform/          Tauri invoke wrappers
├── domain.ts          Shared types
├── settings.ts        Persistent settings (store)
└── main.css           Design tokens & Tailwind config
src-tauri/             Rust backend
├── src/lib.rs         Tauri commands (dialog, merge, PDF parsing)
└── Cargo.toml
docs/                  Project documentation
```

## Theming

Colors are managed through CSS custom properties in `src/main.css`.
Changing the accent color or dark theme requires editing only that file.
See [docs/theming.md](docs/theming.md) for details.

## License

MIT
