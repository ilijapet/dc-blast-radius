import * as vscode from 'vscode';

export interface SymbolRisk {
    symbolName: string;
    range: vscode.Range;
    namePosition: vscode.Position;  // selectionRange.start — exact position of the symbol name
    tier: 'local' | 'local-shared' | 'global-shared';
    fanOut: number;
    uniqueFiles: number;
}

export interface RiskThresholds {
    localSharedMax: number;
    globalSharedLow: number;
    globalSharedMed: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
    localSharedMax: 5,
    globalSharedLow: 15,
    globalSharedMed: 40,
};
