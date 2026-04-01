# Contributing

Fyler values **cognitive simplicity**: you should be able to understand where things live and what they do by looking at naming and structure.

## Readability & Refactoring Guidelines (LLM-friendly)

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

## Prompt Snippet (for other LLMs)

When asking an LLM to edit this repo, include something like:

- “Refactor for cognitive simplicity: reduce nesting, keep behavior identical, use an orchestrator + small helpers, keep helpers single-purpose, avoid new abstractions unless reused, no unused code.”

