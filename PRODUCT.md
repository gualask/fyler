# Product

This document owns Fyler's product purpose and design direction. Implementation details belong in
the technical documentation under `docs/`.

## Users

Fyler is for people who need to complete everyday PDF and image tasks without learning a complex
editor or uploading private documents to an online service. Its audience includes occasional home
users, students, office workers, and experienced users who value a fast, controlled local workflow.

## Product purpose

Fyler provides focused desktop workflows for three common jobs:

1. assemble PDFs and images into an ordered PDF;
2. arrange the front and back of a small document on one A4 page;
3. compress several PDFs and images while keeping one output per input.

Success means users can choose a task immediately, understand the resulting document before saving
it, and complete the work without changing their source files.

## Product boundaries

Fyler is not a general-purpose PDF editor. It does not aim to edit text, annotations, forms, or the
full internal structure of a source document. New workflows should solve a specific document task
end to end and remain understandable without specialist terminology.

## Brand personality

Focused, calm, dependable. The interface should feel capable without becoming technical or visually
noisy.

## Anti-references

Avoid dense professional-editor chrome, playful effects that obscure document state, hidden gestures
without visible alternatives, and decorative interfaces that compete with previews.

## Design principles

1. Make the current task and document state obvious.
2. Prefer direct manipulation with visible, accessible alternatives.
3. Make common actions immediate and advanced options progressive.
4. Preserve confidence through previews, reversible interaction, and non-destructive edits.
5. Keep performance predictable for both small and large batches.
6. Keep document processing local and make external interactions explicit.

## Accessibility and inclusion

Target WCAG 2.2 AA for product controls. Preserve keyboard-operable alternatives for pointer
interactions, clear focus states, screen-reader labels and status announcements, adequate contrast
across themes, and reduced-motion preferences.
