import * as vscode from 'vscode';
import { SymbolRisk, RiskThresholds, DEFAULT_THRESHOLDS } from './types';
import {
    localSharedDecoration,
    globalSharedLowDecoration,
    globalSharedMedDecoration,
    globalSharedHighDecoration,
    ALL_DECORATIONS,
} from './decorations';

export function applyDecorations(
    editor: vscode.TextEditor,
    risks: SymbolRisk[],
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS
): void {
    const amber: vscode.Range[] = [];
    const redLow: vscode.Range[] = [];
    const redMed: vscode.Range[] = [];
    const redHigh: vscode.Range[] = [];

    for (const risk of risks) {
        if (risk.tier === 'local') {
            continue;
        }

        if (risk.tier === 'local-shared') {
            amber.push(risk.range);
            continue;
        }

        // global-shared: pick intensity based on uniqueFiles count
        if (risk.uniqueFiles <= thresholds.globalSharedLow) {
            redLow.push(risk.range);
        } else if (risk.uniqueFiles <= thresholds.globalSharedMed) {
            redMed.push(risk.range);
        } else {
            redHigh.push(risk.range);
        }
    }

    editor.setDecorations(localSharedDecoration, amber);
    editor.setDecorations(globalSharedLowDecoration, redLow);
    editor.setDecorations(globalSharedMedDecoration, redMed);
    editor.setDecorations(globalSharedHighDecoration, redHigh);
}

export function clearAllDecorations(editor: vscode.TextEditor): void {
    for (const decoration of ALL_DECORATIONS) {
        editor.setDecorations(decoration, []);
    }
}
