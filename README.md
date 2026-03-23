# DC Blast Radius

Visualize architectural risk directly in your editor. DC Blast Radius colors functions, classes, and symbols based on how many other files depend on them. The more things depend on a symbol, the more dangerous it is to change — and the redder it glows.

## Installation

```bash
code --install-extension dc-blast-radius-0.1.0.vsix
```

Then reload VS Code (`Ctrl+Shift+P` > `Developer: Reload Window`).

## How It Works

Every symbol in your codebase falls into one of three risk tiers:

| Tier | Visual | Meaning |
|------|--------|---------|
| **Local** | No decoration | Used only within its own file. Safe to change freely. |
| **Local Shared** | Amber background | Used by a few other files. Changes have limited blast radius. |
| **Global Shared** | Red background (intensity scales) | Used widely across the codebase. Changing this can break everything. |

DC Blast Radius uses the **language server already running in VS Code** (Pylance for Python, tsserver for TypeScript/JavaScript, etc.) to find references. No external tools, no indexing, no configuration required.

## Features

- **Background coloring** — risk tiers shown as subtle background tints on symbol definitions
- **CodeLens labels** — clickable labels above risky symbols showing exact reference counts (e.g., `Shared · 28 refs across 5 files`)
- **Dependency tree panel** — click a CodeLens to see every file and line that depends on that symbol, with click-to-navigate
- **Status bar summary** — quick overview of the current file's risk profile
- **Theme-aware** — colors adapt to both dark and light themes
- **Configurable thresholds** — tune what counts as "local shared" vs "global shared" in VS Code Settings

## Supported Languages

Works with any language that has a VS Code language server providing document symbols and references:

- **Python** (via Pylance/Pyright)
- **TypeScript / JavaScript** (via tsserver)
- **Go** (via gopls)
- **Rust** (via rust-analyzer)
- **Java** (via Language Support for Java)
- And many more

## Commands

Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

| Command | Description |
|---------|-------------|
| `DC Blast Radius: Refresh Analysis` | Clear cache and re-analyze the current file |
| `DC Blast Radius: Toggle Visibility` | Turn decorations on/off |
| `DC Blast Radius: Show Dependents` | Show dependency tree for a symbol |

## Settings

Search "Blast Radius" in VS Code Settings, or add to `settings.json`:

```json
{
    // Enable/disable the extension
    "blastRadius.enabled": true,

    // Max unique external files to remain "local shared" (amber).
    // Above this threshold becomes "global shared" (red).
    "blastRadius.thresholds.localSharedMax": 5,

    // Upper bound for low-intensity red
    "blastRadius.thresholds.globalSharedLow": 15,

    // Upper bound for medium-intensity red. Above this becomes high-intensity.
    "blastRadius.thresholds.globalSharedMed": 40,

    // Which symbol kinds to analyze
    "blastRadius.symbolKinds": ["Function", "Class", "Method", "Interface", "Enum", "Variable", "Constant"],

    // Max concurrent reference lookups (lower = less load on language server)
    "blastRadius.concurrencyLimit": 5
}
```

## How It Analyzes

1. When you open a file, the extension asks the language server for all symbol definitions (functions, classes, methods, etc.)
2. For each symbol, it asks the language server for every reference across the workspace
3. It counts how many unique *external* files reference each symbol
4. Based on configurable thresholds, it assigns a risk tier
5. Results are cached until the file is saved or you manually refresh

The language server resolves everything: imports, aliases, re-exports, barrel files. The analysis is semantically accurate with zero configuration.

## Behavior

- **Open a file** — analysis runs automatically
- **Edit a file** — decorations clear (stale data)
- **Save a file** — re-analyzes with fresh data (debounced for rapid saves)
- **Switch files** — analyzes the new file (cache hit if already analyzed)
- **Change settings** — re-analyzes immediately with new thresholds

## License

MIT
