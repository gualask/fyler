# Release process

This guide covers publishing a Fyler desktop release from a clean `main` branch. Publishing is
tag-driven: pushing a tag that matches `v*` starts `.github/workflows/release.yml`.

## 1. Prepare the release

Choose the next version and update all version owners:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- the `fyler` package entry in `src-tauri/Cargo.lock`

Move the relevant entries from `Unreleased` in `CHANGELOG.md` into a heading formatted as
`<version> - YYYY-MM-DD`, then leave a new empty `Unreleased` section at the top.

Review the public documentation for changes to workflows, supported formats, privacy behavior,
downloads, and build prerequisites. Release assets should represent every primary workflow described
by the README.

## 2. Verify the release candidate

Install the locked dependencies and run the complete CI sequence:

```bash
pnpm install --frozen-lockfile
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

Build and manually smoke-test the native app on at least one platform:

```bash
pnpm tauri:build
```

Verify the task home, all three workflows, file dialogs and drag-and-drop, successful exports,
failure feedback, support diagnostics, and the update dialog. On Windows, also verify the standalone
build with `pnpm tauri:build:standalone`.

## 3. Tag and publish

Commit the version, changelog, and documentation together. Create an annotated tag whose value
matches the application version:

```bash
git tag -a vX.Y.Z -m "Fyler X.Y.Z"
git push origin main
git push origin vX.Y.Z
```

The release workflow then:

1. runs the reusable CI workflow;
2. creates a draft GitHub release with generated release notes;
3. builds macOS Apple Silicon, macOS Intel, Linux, and Windows artifacts;
4. uploads the signed updater artifacts and Windows standalone executable;
5. generates and uploads `SHA256SUMS.txt` for every release asset;
6. publishes the GitHub release after every build and checksum job succeeds.

The repository must provide `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets for updater artifact signing. The workflow uses the
repository `GITHUB_TOKEN` for release creation and uploads.

Tauri updater signatures are separate from Windows code signing. Until Windows code signing is
configured, Windows builds may trigger Microsoft Defender SmartScreen.

## 4. Verify publication

After the workflow succeeds:

- compare the published tag, application version, and changelog heading;
- confirm that every expected platform asset is present;
- confirm that `latest.json` is attached for the updater;
- confirm that `SHA256SUMS.txt` is attached and matches the downloaded assets;
- install a release artifact on each available platform and complete a short export smoke test;
- start the previous Fyler release and verify that it offers the new update.

If a build fails before publication, the GitHub release remains a draft. Fix the cause on `main` and
publish a new version/tag rather than moving a tag that users may already have fetched. Do not
replace artifacts in an existing public release to add or change code signing; publish a new patch
release instead.
