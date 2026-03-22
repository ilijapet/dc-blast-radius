 DC Blast Radius — Code Tour

  ~/extensions/blast_radius/src/
  ├── extension.ts          # The brain
  ├── types.ts              # The contracts
  ├── analyzer.ts           # The engine
  ├── decorations.ts        # The paint
  ├── decorator.ts          # The painter
  ├── codelens-provider.ts  # The labels
  ├── tree-provider.ts      # The sidebar
  └── utils.ts              # The helpers

  1. types.ts — The contracts

  Defines two interfaces everything else shares:
  - SymbolRisk — one analyzed symbol: its name, range, name position, tier
  (local/local-shared/global-shared), fan-out count, unique file count
  - RiskThresholds — the configurable boundaries between tiers

  2. extension.ts — The brain

  The entry point. activate() wires everything together:

  activate()
    ├── Creates OutputChannel (logging)
    ├── Creates FileAnalyzer (the engine)
    ├── Registers CodeLensProvider (labels above symbols)
    ├── Registers TreeDataProvider (sidebar panel)
    ├── Creates StatusBarItem (bottom bar summary)
    └── Registers event listeners:
          ├── onDidChangeActiveTextEditor → analyze new file
          ├── onDidChangeTextDocument → clear stale decorations
          ├── onDidSaveTextDocument → debounced re-analysis
          └── onDidChangeConfiguration → re-read settings, re-analyze

  3. analyzer.ts — The engine

  The core. For a given file:

  analyzeFile(document)
    ├── Check cache → return if hit
    ├── Read settings (thresholds, symbol kinds, concurrency)
    ├── executeDocumentSymbolProvider → get all symbols in file
    ├── flattenSymbols → extract methods from classes, filter by kind
    ├── For each symbol (concurrency-limited):
    │     ├── executeReferenceProvider → get ALL references across workspace
    │     ├── Filter out self-references (same file)
    │     ├── Count unique external files
    │     └── computeTier → local / local-shared / global-shared
    ├── Cache results
    └── Return SymbolRisk[]

  Two VS Code API calls do all the work:
  - vscode.executeDocumentSymbolProvider — "what's defined in this file?"
  - vscode.executeReferenceProvider — "who uses this symbol?"

  The language server (Pylance, tsserver, etc.) handles all the hard stuff: import resolution,
  aliases, re-exports.

  4. decorations.ts — The paint

  Defines 4 decoration types (reusable visual styles):
  - Amber — local-shared (light: stronger, dark: subtle)
  - Red low — global-shared, 6-15 files
  - Red medium — global-shared, 16-40 files
  - Red high — global-shared, 40+ files

  Each has light and dark variants so colors work on both themes.

  5. decorator.ts — The painter

  Takes SymbolRisk[] from the analyzer and groups them by tier:

  applyDecorations(editor, risks)
    ├── Skip 'local' (no decoration)
    ├── 'local-shared' → amber ranges
    ├── 'global-shared' → red low/med/high based on uniqueFiles
    └── editor.setDecorations(type, ranges) for each group

  6. codelens-provider.ts — The labels

  Reads from the analyzer's cache. For each non-local symbol, creates a CodeLens:

  provideCodeLenses(document)
    ├── Get cached risks from analyzer
    ├── Filter to non-local only
    └── For each: CodeLens with label + click command
          "Shared · 28 refs across 5 files"
          → click triggers blastRadius.showDependents

  7. tree-provider.ts — The sidebar

  When you click a CodeLens:

  showDependents(symbolName, uri, position)
    ├── Reconstruct Uri/Position (CodeLens serializes to plain objects)
    ├── executeReferenceProvider → get all references
    ├── Group by file, exclude self-references
    ├── Sort by ref count descending
    └── Fire onDidChangeTreeData → tree renders

  Tree structure:
    ▼ router.py (19 refs)
      ├── line 45: controller = ProjectController(db)
      ├── line 78: result = controller.create_project(...)
      └── ...
    ▼ controller.py (2 refs)
      └── line 12: from .controller import ProjectController

  Click any leaf → navigates to that exact file and line.

  8. utils.ts — The helpers

  - parallelLimit — runs N async tasks at a time (prevents overwhelming the language server)
  - debounce — delays execution until input stops (prevents re-analyzing on every rapid save)

  The data flow

  File opened
    → extension.ts: refreshDecorations()
      → analyzer.ts: analyzeFile() → SymbolRisk[]
        → decorator.ts: applyDecorations() → colored backgrounds
        → codelens-provider.ts: refresh() → labels above symbols
        → extension.ts: update status bar

  CodeLens clicked
    → extension.ts: blastRadius.showDependents command
      → tree-provider.ts: showDependents() → fetch refs, build tree
        → sidebar panel renders file/line tree

  That's the whole extension — ~350 lines of actual logic, 8 files, zero external dependencies.
  Everything runs through two VS Code API calls that the language server already supports.