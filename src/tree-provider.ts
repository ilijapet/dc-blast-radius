import * as vscode from 'vscode';
import { isThirdParty } from './utils';

interface FileNode {
    type: 'file';
    uri: vscode.Uri;
    refs: vscode.Location[];
}

interface RefNode {
    type: 'reference';
    uri: vscode.Uri;
    range: vscode.Range;
    linePreview: string;
}

type DependentNode = FileNode | RefNode;

export class DependencyTreeProvider implements vscode.TreeDataProvider<DependentNode> {
    private _onDidChange = new vscode.EventEmitter<DependentNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChange.event;

    private fileNodes: FileNode[] = [];

    async showDependents(_symbolName: string, rawUri: any, rawPosition: any): Promise<void> {
        // Guard: command can be invoked without args (e.g. from command palette or tree focus)
        if (!rawUri || !rawPosition) {
            return;
        }

        // Reconstruct proper types — CodeLens serializes args to plain objects
        let uri: vscode.Uri;
        if (rawUri instanceof vscode.Uri) {
            uri = rawUri;
        } else {
            // Serialized URI: use fsPath/path to reconstruct via Uri.file (most reliable for file:// URIs)
            const filePath = rawUri.fsPath || rawUri._fsPath || rawUri.path;
            uri = vscode.Uri.file(filePath);
        }

        let position: vscode.Position;
        if (rawPosition instanceof vscode.Position) {
            position = rawPosition;
        } else {
            position = new vscode.Position(rawPosition.line, rawPosition.character);
        }

        const refs = await vscode.commands.executeCommand<vscode.Location[]>(
            'vscode.executeReferenceProvider',
            uri,
            position
        );

        // Group by file, exclude the definition file
        const byFile = new Map<string, vscode.Location[]>();
        const thisFile = uri.toString();

        if (refs) {
            for (const ref of refs) {
                const refUri = ref.uri.toString();
                if (refUri === thisFile || isThirdParty(refUri)) {
                    continue;
                }
                const key = refUri;
                if (!byFile.has(key)) {
                    byFile.set(key, []);
                }
                byFile.get(key)!.push(ref);
            }
        }

        this.fileNodes = Array.from(byFile.entries()).map(([, locs]) => ({
            type: 'file' as const,
            uri: locs[0].uri,
            refs: locs,
        }));

        // Sort by number of refs descending
        this.fileNodes.sort((a, b) => b.refs.length - a.refs.length);

        this._onDidChange.fire(undefined);
    }

    getTreeItem(element: DependentNode): vscode.TreeItem {
        if (element.type === 'file') {
            const relativePath = vscode.workspace.asRelativePath(element.uri);
            const item = new vscode.TreeItem(
                `${relativePath} (${element.refs.length})`,
                vscode.TreeItemCollapsibleState.Expanded
            );
            item.iconPath = vscode.ThemeIcon.File;
            item.resourceUri = element.uri;
            return item;
        }

        // Reference node
        const line = element.range.start.line + 1;
        const item = new vscode.TreeItem(
            `line ${line}: ${element.linePreview}`,
            vscode.TreeItemCollapsibleState.None
        );
        item.command = {
            title: 'Go to reference',
            command: 'vscode.open',
            arguments: [
                element.uri,
                { selection: new vscode.Range(element.range.start, element.range.end) },
            ],
        };
        item.iconPath = new vscode.ThemeIcon('symbol-reference');
        return item;
    }

    async getChildren(element?: DependentNode): Promise<DependentNode[]> {
        if (!element) {
            return this.fileNodes;
        }

        if (element.type === 'file') {
            const refNodes: RefNode[] = [];
            for (const ref of element.refs) {
                let linePreview = '';
                try {
                    const doc = await vscode.workspace.openTextDocument(ref.uri);
                    linePreview = doc.lineAt(ref.range.start.line).text.trim();
                } catch {
                    linePreview = '(unable to read)';
                }

                refNodes.push({
                    type: 'reference',
                    uri: ref.uri,
                    range: ref.range,
                    linePreview,
                });
            }
            return refNodes;
        }

        return [];
    }

    getFirstNode(): FileNode | undefined {
        return this.fileNodes[0];
    }

    getNodeCount(): number {
        return this.fileNodes.length;
    }
}
