import * as vscode from 'vscode';
import { FileAnalyzer } from './analyzer';

export class BlastRadiusCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChange.event;

    constructor(private analyzer: FileAnalyzer) {}

    refresh(): void {
        this._onDidChange.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const risks = this.analyzer.getCached(document.uri);
        if (!risks) {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];

        for (const risk of risks) {
            if (risk.tier === 'local') {
                continue;
            }

            const label = risk.tier === 'local-shared'
                ? `Shared · ${risk.fanOut} refs across ${risk.uniqueFiles} files`
                : `Global shared · ${risk.fanOut} refs across ${risk.uniqueFiles} files`;

            lenses.push(new vscode.CodeLens(risk.range, {
                title: label,
                command: 'blastRadius.showDependents',
                arguments: [risk.symbolName, document.uri, risk.namePosition],
            }));
        }

        return lenses;
    }
}
