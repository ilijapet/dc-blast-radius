import * as vscode from 'vscode';

// Theme-aware colors: different values for light vs dark themes
export const localSharedDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        backgroundColor: 'rgba(200, 150, 0, 0.12)',
        overviewRulerColor: 'rgba(200, 150, 0, 0.6)',
    },
    dark: {
        backgroundColor: 'rgba(255, 190, 60, 0.08)',
        overviewRulerColor: 'rgba(255, 190, 60, 0.6)',
    },
    isWholeLine: true,
    overviewRulerLane: vscode.OverviewRulerLane.Left,
});

export const globalSharedLowDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        backgroundColor: 'rgba(220, 40, 40, 0.08)',
        overviewRulerColor: 'rgba(220, 40, 40, 0.4)',
    },
    dark: {
        backgroundColor: 'rgba(255, 60, 60, 0.06)',
        overviewRulerColor: 'rgba(255, 60, 60, 0.4)',
    },
    isWholeLine: true,
    overviewRulerLane: vscode.OverviewRulerLane.Left,
});

export const globalSharedMedDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        backgroundColor: 'rgba(220, 40, 40, 0.15)',
        overviewRulerColor: 'rgba(220, 40, 40, 0.6)',
    },
    dark: {
        backgroundColor: 'rgba(255, 60, 60, 0.12)',
        overviewRulerColor: 'rgba(255, 60, 60, 0.6)',
    },
    isWholeLine: true,
    overviewRulerLane: vscode.OverviewRulerLane.Left,
});

export const globalSharedHighDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        backgroundColor: 'rgba(200, 20, 20, 0.22)',
        overviewRulerColor: 'rgba(200, 20, 20, 0.9)',
    },
    dark: {
        backgroundColor: 'rgba(255, 40, 40, 0.20)',
        overviewRulerColor: 'rgba(255, 40, 40, 0.9)',
    },
    isWholeLine: true,
    overviewRulerLane: vscode.OverviewRulerLane.Left,
});

export const ALL_DECORATIONS = [
    localSharedDecoration,
    globalSharedLowDecoration,
    globalSharedMedDecoration,
    globalSharedHighDecoration,
];
