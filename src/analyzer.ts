import * as vscode from 'vscode';
import { SymbolRisk, RiskThresholds } from './types';
import { parallelLimit } from './utils';

const SYMBOL_KIND_MAP: Record<string, vscode.SymbolKind> = {
    'Function': vscode.SymbolKind.Function,
    'Class': vscode.SymbolKind.Class,
    'Method': vscode.SymbolKind.Method,
    'Interface': vscode.SymbolKind.Interface,
    'Enum': vscode.SymbolKind.Enum,
    'Variable': vscode.SymbolKind.Variable,
    'Constant': vscode.SymbolKind.Constant,
    'Property': vscode.SymbolKind.Property,
};

function readConfig(): { thresholds: RiskThresholds; symbolKinds: vscode.SymbolKind[]; concurrencyLimit: number } {
    const config = vscode.workspace.getConfiguration('blastRadius');

    const thresholds: RiskThresholds = {
        localSharedMax: config.get('thresholds.localSharedMax', 5),
        globalSharedLow: config.get('thresholds.globalSharedLow', 15),
        globalSharedMed: config.get('thresholds.globalSharedMed', 40),
    };

    const kindNames = config.get<string[]>('symbolKinds', ['Function', 'Class', 'Method', 'Interface', 'Enum', 'Variable', 'Constant']);
    const symbolKinds = kindNames
        .map(name => SYMBOL_KIND_MAP[name])
        .filter((k): k is vscode.SymbolKind => k !== undefined);

    const concurrencyLimit = config.get('concurrencyLimit', 5);

    return { thresholds, symbolKinds, concurrencyLimit };
}

export class FileAnalyzer {
    private cache = new Map<string, SymbolRisk[]>();
    private log: vscode.OutputChannel;

    constructor(log: vscode.OutputChannel) {
        this.log = log;
    }

    async analyzeFile(document: vscode.TextDocument): Promise<SymbolRisk[]> {
        const cacheKey = document.uri.toString();
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const { thresholds, symbolKinds, concurrencyLimit } = readConfig();

        // Step 1: Get all symbols in the file
        const rawSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!rawSymbols || rawSymbols.length === 0) {
            return [];
        }

        const symbols = flattenSymbols(rawSymbols, symbolKinds);
        this.log.appendLine(`Analyzing ${document.fileName} (${symbols.length} symbols)`);

        // Step 2: Get references for each symbol (concurrency-limited)
        const tasks = symbols.map((symbol) => async (): Promise<SymbolRisk> => {
            const position = symbol.selectionRange.start;

            const refs = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider',
                document.uri,
                position
            );

            // Count unique external files
            const externalFiles = new Set<string>();
            let fanOut = 0;

            if (refs) {
                const thisFile = document.uri.toString();
                for (const ref of refs) {
                    if (ref.uri.toString() !== thisFile) {
                        externalFiles.add(ref.uri.toString());
                        fanOut++;
                    }
                }
            }

            const uniqueFiles = externalFiles.size;
            const tier = computeTier(uniqueFiles, thresholds);

            return {
                symbolName: symbol.name,
                range: symbol.range,
                namePosition: symbol.selectionRange.start,
                tier,
                fanOut,
                uniqueFiles,
            };
        });

        const risks = await parallelLimit(tasks, concurrencyLimit);

        const nonLocal = risks.filter(r => r.tier !== 'local');
        if (nonLocal.length > 0) {
            for (const r of nonLocal) {
                this.log.appendLine(`  ${r.symbolName}: ${r.tier} (${r.uniqueFiles} files, ${r.fanOut} refs)`);
            }
        }

        this.cache.set(cacheKey, risks);
        return risks;
    }

    getCached(uri: vscode.Uri): SymbolRisk[] | undefined {
        return this.cache.get(uri.toString());
    }

    invalidate(uri: vscode.Uri): void {
        this.cache.delete(uri.toString());
    }

    invalidateAll(): void {
        this.cache.clear();
    }
}

function flattenSymbols(symbols: vscode.DocumentSymbol[], relevantKinds: vscode.SymbolKind[]): vscode.DocumentSymbol[] {
    const result: vscode.DocumentSymbol[] = [];
    for (const s of symbols) {
        if (relevantKinds.includes(s.kind)) {
            result.push(s);
        }
        if (s.children.length > 0) {
            result.push(...flattenSymbols(s.children, relevantKinds));
        }
    }
    return result;
}

function computeTier(
    uniqueExternalFiles: number,
    thresholds: RiskThresholds
): SymbolRisk['tier'] {
    if (uniqueExternalFiles === 0) {
        return 'local';
    }
    if (uniqueExternalFiles <= thresholds.localSharedMax) {
        return 'local-shared';
    }
    return 'global-shared';
}
