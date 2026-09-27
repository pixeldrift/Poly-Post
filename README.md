# Poly Post

A visual, plain-English engine for mapping spreadsheet/CSV data onto structured records — originally proposed as a WordPress "multi-post import" plugin, rebuilt here as a reusable **mapping engine** that any app can sit on top of.

## Concept

Point it at a spreadsheet, drag-connect its columns to a target schema (a WordPress post type today; a database table, another spreadsheet format, or any structured target tomorrow), and get a live preview of the result before committing anything. No documentation required — the workflow explains itself in-context.

Core ideas from the original proposal, still the spec:

- **Auto-match** source columns to target fields on import, with a good starting point every time.
- **Direct, merge, and split connections** — combine `first` + `last` into `Name`, or split `"42 Main St, Riverside, IA"` into `City` / `State`, all via drag-and-drop, no spreadsheet formulas required.
- **Live preview** of the rendered result as you build connections, with pagination through every row.
- **Plain English, zero technical jargon** — status colors and inline prompts instead of documentation.

## What's here

`web/` — a React + TypeScript implementation of the mapper UI (drag-and-drop field connections, edit-connection dialog, live preview, CSV import), built UI-first against a small in-browser transform engine (`web/src/engine/`) with mock WordPress-shaped schemas as the demo target.

```
web/
  src/
    engine/        # auto-match, transform (direct/merge/split), preview rendering — target-agnostic
    data/          # demo source data + mock target schemas (Employee Directory, Branch Location)
    components/    # the mapper canvas, connection editor, preview panel, import dialog
    store.ts       # app state (Zustand)
```

### Run it

```sh
cd web
npm install
npm run dev
```

## Where this goes next

The UI now proves the interaction model end-to-end against mock data. The engine layer (`web/src/engine/`) is intentionally decoupled from anything WordPress-specific — the next step is swapping the mock target schemas for real destinations (a live WordPress REST API, another spreadsheet format, a generic JSON/database target) without touching the mapping UI.
