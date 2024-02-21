import { join } from 'path';
import { ExtensionContext, Uri, ViewColumn, Webview, commands, window } from 'vscode';





export function scriptAssetPath(context: ExtensionContext, folders: string[]) {
	return Uri.file(join(context.extensionPath, 'dist', 'webview', ...folders));
}

export function scriptAssetUri(context: ExtensionContext, webview: Webview, folders: string[]) {
	return webview.asWebviewUri(scriptAssetPath(context, folders));
}


export function webviewUri(context: ExtensionContext, webview: Webview, folders: string[]) {
	return webview.asWebviewUri(scriptAssetPath(context, folders));
}
