# Privacy

This document describes how the current Fyler desktop application handles files, preferences,
diagnostics, and network access.

## Document processing

Fyler processes PDFs and images on the device where the app is running. Source files are read from
paths selected or dropped by the user, and exported files are written only to a destination chosen
by the user. Fyler does not upload document contents to a Fyler-operated service.

Imported-source metadata and bounded image previews are retained in memory for the active workflow.
When a PDF page is prepared for the front/back workflow, Fyler creates a temporary JPEG raster and
removes it when the source is released. The original source files are not modified.

## Local preferences

Fyler stores these preferences locally through the Tauri application store:

- language;
- light or dark theme;
- accent color;
- whether the merge tutorial has been seen;
- final-document layout preference.

Fyler does not use an analytics or telemetry service.

## Network access

Release builds with the updater enabled check the project's GitHub Releases endpoint when the app
starts. If an update is available, Fyler downloads it only after the user chooses to install it.
The Windows standalone build disables the updater.

The in-app support flow opens GitHub in the default browser only after the user chooses to report a
problem. GitHub's own privacy terms apply once its website is opened.

## Diagnostics and support

Fyler keeps recent diagnostic events in the running application so errors can be investigated. A
diagnostic report can include:

- Fyler version, platform, and architecture;
- language and theme;
- counts and current workflow settings;
- recent operation and error messages.

Choosing **Open GitHub issue** copies the diagnostic report to the clipboard and opens a prefilled
issue template; the report is not inserted or submitted automatically. Users should review the
clipboard contents before pasting them into a public issue. Diagnostics can also be copied or saved
locally without opening GitHub.

## Questions

For privacy questions, open a [GitHub issue](https://github.com/gualask/fyler/issues) without
including private document contents or sensitive personal information.
