import * as vscode from 'vscode';
import { applyDecorations, clearAllDecorations } from './decorator';
import { FileAnalyzer } from './analyzer';
import { BlastRadiusCodeLensProvider } from './codelens-provider';
import { DependencyTreeProvider } from './tree-provider';
import { debounce } from './utils';

let enabled: boolean;
let analyzer: FileAnalyzer;
let statusBarItem: vscode.StatusBarItem;
let log: vscode.OutputChannel;
let codeLensProvider: BlastRadiusCodeLensProvider;
let treeProvider: DependencyTreeProvider;

async function refreshDecorations(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) {
        statusBarItem.hide();
        return;
    }

    if (!enabled) {
        clearAllDecorations(editor);
        statusBarItem.text = '$(shield) DC Blast Radius: off';
        statusBarItem.show();
        return;
    }

    statusBarItem.text = '$(loading~spin) Analyzing...';
    statusBarItem.show();

    try {
        const risks = await analyzer.analyzeFile(editor.document);
        applyDecorations(editor, risks);
        codeLensProvider.refresh();

        const globalCount = risks.filter(r => r.tier === 'global-shared').length;
        const sharedCount = risks.filter(r => r.tier === 'local-shared').length;
        const localCount = risks.filter(r => r.tier === 'local').length;

        const parts: string[] = [];
        if (globalCount > 0) { parts.push(`${globalCount} global`); }
        if (sharedCount > 0) { parts.push(`${sharedCount} shared`); }
        if (localCount > 0) { parts.push(`${localCount} local`); }

        statusBarItem.text = parts.length > 0
            ? `$(shield) ${parts.join(' · ')}`
            : '$(shield) No symbols';
        statusBarItem.show();
    } catch (err) {
        log.appendLine(`ERROR: ${err}`);
        statusBarItem.text = '$(shield) DC Blast Radius: error';
        statusBarItem.show();
    }
}

export function activate(context: vscode.ExtensionContext) {
    log = vscode.window.createOutputChannel('DC Blast Radius');
    log.appendLine('DC Blast Radius activated');

    // Read initial enabled state from settings
    enabled = vscode.workspace.getConfiguration('blastRadius').get('enabled', true);

    analyzer = new FileAnalyzer(log);

    // CodeLens provider
    codeLensProvider = new BlastRadiusCodeLensProvider(analyzer);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
    );

    // Dependency tree panel
    treeProvider = new DependencyTreeProvider();
    const treeView = vscode.window.createTreeView('blastRadiusDependents', {
        treeDataProvider: treeProvider,
    });
    context.subscriptions.push(treeView);

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 100
    );
    statusBarItem.command = 'blastRadius.toggle';
    context.subscriptions.push(statusBarItem);

    // Apply decorations to the active editor on startup
    refreshDecorations(vscode.window.activeTextEditor);

    // Re-apply when switching files
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            refreshDecorations(editor);
        })
    );

    // Clear stale decorations when editing
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.contentChanges.length === 0) {
                return;
            }
            analyzer.invalidate(e.document.uri);
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === e.document) {
                clearAllDecorations(editor);
                statusBarItem.text = '$(shield) DC Blast Radius: editing...';
            }
        })
    );

    // Debounced re-analyze on save (1 second delay for rapid saves / auto-save)
    const debouncedRefresh = debounce((doc: vscode.TextDocument) => {
        analyzer.invalidate(doc.uri);
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === doc) {
            refreshDecorations(editor);
        }
    }, 1000);

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            debouncedRefresh(document);
        })
    );

    // Refresh command — full cache clear
    context.subscriptions.push(
        vscode.commands.registerCommand('blastRadius.refresh', () => {
            const editor = vscode.window.activeTextEditor;
            analyzer.invalidateAll();
            refreshDecorations(editor);
        })
    );

    // Toggle command
    context.subscriptions.push(
        vscode.commands.registerCommand('blastRadius.toggle', () => {
            enabled = !enabled;
            refreshDecorations(vscode.window.activeTextEditor);
            vscode.window.showInformationMessage(
                `DC Blast Radius: ${enabled ? 'enabled' : 'disabled'}`
            );
        })
    );

    // Show dependents command — triggered by CodeLens click
    context.subscriptions.push(
        vscode.commands.registerCommand('blastRadius.showDependents',
            async (symbolName: string, uri: vscode.Uri, position: vscode.Position) => {
                await treeProvider.showDependents(symbolName, uri, position);
                await vscode.commands.executeCommand('blastRadiusDependents.focus');
            }
        )
    );

    // Re-read settings when they change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('blastRadius')) {
                enabled = vscode.workspace.getConfiguration('blastRadius').get('enabled', true);
                analyzer.invalidateAll();
                refreshDecorations(vscode.window.activeTextEditor);
            }
        })
    );
}

export function deactivate() {
    // Cleanup handled by subscriptions
}
