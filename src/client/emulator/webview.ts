import { join } from 'path';
import { ExtensionContext, Uri, ViewColumn, commands, window } from 'vscode';
import { emulatorAssetPath } from './assets';


export function createWebView(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand('extension.emulator.option1', (contextSelection: Uri, allSelections: Uri[]) => {
			window.showInformationMessage('BeebVSC: extension.emulator.option1 selected');
		}));
	context.subscriptions.push(
		commands.registerCommand('extension.emulator.option2', (contextSelection: Uri, allSelections: Uri[]) => {
			window.showInformationMessage('BeebVSC: extension.emulator.option2 selected');
		}));

	context.subscriptions.push(
		commands.registerCommand('extension.emulator.start', (contextSelection: Uri, allSelections: Uri[]) => {
			// Create and show a new webview
			const panel = window.createWebviewPanel(
				'emulator', // Identifies the type of the webview. Used internally
				'JSBeeb', // Title of the panel displayed to the user
				ViewColumn.One, // Editor column to show the new webview panel in.
				{
					enableScripts: true,					
					// Only allow the webview to access resources in our extension's media directory
					localResourceRoots: [
						emulatorAssetPath(context, ''),
						emulatorAssetPath(context, 'roms'),
						emulatorAssetPath(context, 'sounds'),
						// Uri.file(join(context.extensionPath, 'assets', 'jsbeeb')),
						// // Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'images')),
						// Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'roms')),
						// Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'sounds')),
						// // Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'discs')),
					]

				} // Webview options. More on these later.
			);


			// And set its HTML content

			panel.webview.html = getWebviewContent(contextSelection); //getWebviewContent2(context);
		}));
}


function getWebviewContent(contextSelection: Uri) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>JSBeeb</title>
</head>
<body>

Hello world<br>
You selected file ${contextSelection.fsPath}<br>
</body>
</html>`;
}