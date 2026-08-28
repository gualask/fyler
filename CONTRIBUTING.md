# Contributing

This guide covers local setup, repository conventions, and the checks expected before a change is
submitted. See [Architecture](docs/architecture.md) for ownership and dependency rules.

## Prerequisites

- Rust stable
- Node.js LTS
- Corepack with the pnpm version declared in `package.json`
- Tauri's platform prerequisites for your operating system

On Ubuntu-based Linux systems:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## Local setup

```bash
corepack enable
pnpm install
pnpm tauri:dev
```

Use `pnpm dev` for browser-safe fixtures and frontend work that does not need native Tauri behavior.
The available routes and their intended use are documented in
[Frontend testing](docs/frontend-testing.md).

## Repository map

- `src/app/` composes the frontend application.
- `src/modules/` owns user workflows.
- `src/capabilities/` contains workflow-neutral contracts and behavior.
- `src/infrastructure/` implements browser and Tauri runtime adapters.
- `src/shared/` contains stable shared primitives.
- `src-tauri/src/` contains the Rust backend with the same module/capability/infrastructure split.

Do not bypass these boundaries. `pnpm boundaries:check` and
`pnpm runtime-boundaries:check` enforce the repository's dependency rules.

## Verification

Run the same checks used by CI before submitting a change:

```bash
pnpm boundaries:check
pnpm dead-code:check
pnpm lint
pnpm i18n:check
pnpm test
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo clippy -q --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test -q --manifest-path src-tauri/Cargo.toml
```

During development, `pnpm test:watch` runs frontend tests in watch mode. Add or update English and
Italian messages together; `pnpm i18n:check` rejects mismatched dictionaries and unsafe translation
usage.

## Change expectations

- Keep a change focused on one behavior or maintenance goal.
- Add regression coverage for corrected defects and tests for new domain behavior.
- Update public documentation when user-visible behavior, supported formats, setup, or release
  behavior changes.
- Update `CHANGELOG.md` for user-visible changes intended for the next release.
- Do not mix behavior changes into a refactor unless the behavior change is explicit.
- Keep generated output, local screenshots, diagnostics, and Playwright inspection artifacts out of
  git.

## Code conventions

Fyler values cognitive simplicity: naming and structure should make ownership and behavior apparent.

- Prefer one public orchestrator per workflow with small, single-purpose helpers.
- Flatten control flow with early returns or continues.
- Use domain-first names such as `compose document`, `resolve source`, or `load cached PDF`.
- Keep resource lifetimes and side effects explicit.
- Keep mechanical details such as cache-entry handling and error mapping out of the main flow.
- Avoid generic utilities, dead code, and speculative abstractions.
- Preserve existing data flow and avoid unnecessary allocations or clones.

## File and directory naming

- Frontend directories use kebab-case.
- Rust module directories use snake_case.
- Visual React components use PascalCase filenames.
- Hooks use kebab-case filenames with a `.hook` suffix and export `useXxx`.
- Context providers use kebab-case filenames with a `.provider.tsx` suffix.
- Pure modules use kebab-case filenames unless they are tied to one component.
- Prefer `<module>.<role>.ts` over generic names such as `settings.ts` or `types.ts`.
- Use a shared component prefix when several files belong only to that component.
- Avoid micro-files unless they remove real complexity or establish a stable boundary.
- Avoid single-symbol re-export files unless they form a deliberate public boundary.

## Releases

Publishing is tag-driven and requires coordinated version and changelog updates. Follow the
[release process](docs/releasing.md); pushing a `v*` tag starts the public release workflow.
