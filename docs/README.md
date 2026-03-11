# Docs

This directory is the project knowledge and context hub.

Use [`index.md`](./index.md) as the primary discovery page. It links to the active documentation areas and should remain the fastest way to find project context.

## Structure

- [`index.md`](./index.md): top-level knowledge/context index.
- [`knowledge/`](./knowledge/): durable project knowledge, learnings, decisions, and operating context.
- [`deployment/`](./deployment/): deployment notes, environment setup, and runtime operations.
- [`references/`](./references/): external references, design links, and source material snapshots.
- [`tasks/`](./tasks/): active and completed task notes.
- [`plans/`](./plans/): implementation plans and larger work breakdowns.
- [`v0-design/`](./v0-design/): initial design reference artifacts.

## Conventions

- Add new docs under the most relevant section instead of placing them loosely at the repo root.
- Link new docs from [`index.md`](./index.md) or from the relevant section index so they stay discoverable.
- Prefer small focused documents with clear titles over one large catch-all file.
- When a document depends on another document, add a backlink or "Related" section.
