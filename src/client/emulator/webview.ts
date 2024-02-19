import { ExtensionContext, Uri, ViewColumn, Webview, commands, window } from 'vscode';
import { scriptAssetPath, scriptAssetUri } from './assets';

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
			
			const localResourceRoots =  [
				scriptAssetPath(context, []),
				scriptAssetPath(context, ['images']),
				scriptAssetPath(context, ['jsbeeb']),
				scriptAssetPath(context, ['jsbeeb', 'roms']),
				scriptAssetPath(context, ['jsbeeb', 'sounds']),
			];

			console.log('localResourceRoots=' + JSON.stringify(localResourceRoots));

			// Create and show a new webview
			const panel = window.createWebviewPanel(
				'emulator', // Identifies the type of the webview. Used internally
				'JSBeeb', // Title of the panel displayed to the user
				ViewColumn.One, // Editor column to show the new webview panel in.
				{
					enableScripts: true,					
					// Only allow the webview to access specific resources in our extension's dist folder
					localResourceRoots,
				} // Webview options. More on these later.
			);


			// And set its HTML content
			const webview = panel.webview;
			webview.html = getWebviewContent(context, webview, contextSelection); //getWebviewContent2(context);
		}));
}


function getWebviewContent(context: ExtensionContext, webview: Webview, contextSelection: Uri) {

	function getResources(filenames: string[]) {
		const resources: Record<string, string> = {};
		for (const filename of filenames) {
			resources[filename] = scriptAssetUri(context, webview, ['jsbeeb', ...filename.split('/')]).toString();	
		}
		return resources;
	}

	const JSBEEB_RESOURCES = getResources([
		'roms/os.rom',
		'roms/BASIC.ROM',
		'sounds/disc525/motoron.wav',
		'sounds/disc525/motoroff.wav',
		'sounds/disc525/motor.wav',
		'sounds/disc525/step.wav',
		'sounds/disc525/seek.wav',
		'sounds/disc525/seek2.wav',
		'sounds/disc525/seek3.wav',
		'discs/elite.ssd',
	]);
	console.log('JSBEEB_RESOURCES=' + JSON.stringify(JSBEEB_RESOURCES));
	const mainScriptUrl = scriptAssetUri(context, webview, ['main.js']).toString();
	console.log('mainScriptUrl=' + mainScriptUrl);

	// <script nonce="${getNonce()}" defer="defer" src="${mainScriptUrl}"></script>		

	return `<!DOCTYPE html>
<html lang="en">
<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>JSBeeb</title>
		<script type='text/javascript'>
			console.log("running script");
			const JSBEEB_RESOURCES=${JSON.stringify(JSBEEB_RESOURCES)};
		 	console.log("Window JSBEEB_RESOURCES Config=" + JSBEEB_RESOURCES);
		</script>
		<script defer="defer" src="${mainScriptUrl}"></script>				
</head>
<body>

Hello world<br>
You selected file ${contextSelection.fsPath}<br>
<img src="${ scriptAssetUri(context, webview, ['images', 'test-card.webp']) }">
</body>
</html>`;
}

// <!--
// <script nonce="${getNonce()}" defer="defer" type='text/javascript'>
// 	window.JSBEEB_RESOURCES=${JSON.stringify(JSBEEB_RESOURCES)}
// 	console.log("Window JSBEEB_RESOURCES Config=" + window.JSBEEB_RESOURCES);
// </script>
// <script nonce="${getNonce()}" defer="defer" src="main.js"></script>		
// -->