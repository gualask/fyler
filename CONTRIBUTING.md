# Contributing

Fyler values **cognitive simplicity**: you should be able to understand where things live and what they do by looking at naming and structure.

- Prefer consistent naming: a reader should infer “what this is” from the path alone.
- Prefer **one public orchestrator** per workflow, with small private helpers for the steps.
- Keep helpers **single-purpose**: one reason to change, minimal side effects.
- Flatten control flow with **early returns / continues** to avoid deep `if/else` nesting.
- Use **domain-first naming**: `verb + subject` (e.g., “compose document”, “resolve source”, “load cached PDF”).
- Keep resource lifetimes explicit: use **tight scopes** to end borrows early and to make drop points obvious.
- Hide mechanical details behind helpers (cache `entry` handling, error mapping), so the main loop reads like a narrative.
- Avoid “generic utilities” unless they are reused; otherwise keep helpers near the orchestrator.
- Do not introduce workarounds: refactors must keep behavior identical unless the change is explicitly requested.
- Avoid dead code and unnecessary abstractions (YAGNI): add a new type/module only if it reduces real complexity.
- Performance rule of thumb: small helper functions are fine; avoid extra allocations/clones and preserve existing dataflow.

## File and Directory Naming

- Directories use **kebab-case**.
- React components use **PascalCase** filenames.
- App entrypoints may use conventional lowercase names (e.g., `main.tsx`).
- Hooks use **kebab-case** filenames with a `.hook` suffix and export `useXxx`.
- Pure modules (options, rendering helpers, mappers, etc.) use **kebab-case** filenames unless they are strictly tied to one component.
- When multiple files belong exclusively to one component/module, prefer a shared prefix like `ComponentName.*` to keep them grouped.
- Avoid creating “micro-files” (≈ <20 lines) unless they remove real complexity or will be reused soon.
- Avoid single-symbol re-export files unless they represent a stable public boundary (feature root, shared package boundary).
