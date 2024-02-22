import * as vscode from 'vscode';
import { getJsBeebResources, scriptUri, scriptUrl } from '../emulator/assets';

export class EmulatorPanel {
	static instance: EmulatorPanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly context: vscode.ExtensionContext;
	private disposables: vscode.Disposable[] = [];
	private discFileUrl: string = '';

	private constructor(context: vscode.ExtensionContext) {
		this.context = context;

		this.panel = vscode.window.createWebviewPanel(
			'emulator',
			'JSBeeb',
			vscode.ViewColumn.One, {
				enableScripts: true,			
				retainContextWhenHidden: true, // Retain state when hidden		
				// Only allow the webview to access specific resources in our extension's dist folder
				localResourceRoots: [
					// localUri(context, []),
					//contextSelection,
					vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : context.extensionUri,
					scriptUri(context, []),
					scriptUri(context, ['images']),
					scriptUri(context, ['jsbeeb']),
					scriptUri(context, ['jsbeeb', 'roms']),
					scriptUri(context, ['jsbeeb', 'sounds']),
				],
			}
		);
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);		
		this.panel.webview.html = this.getWebviewContent();		
	}


	dispose() {
		EmulatorPanel.instance = undefined;

		this.panel.dispose();

		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	setDiscFileUrl(discFile?: vscode.Uri) {	
		this.discFileUrl = discFile ? this.panel.webview.asWebviewUri(discFile).toString() : '';
	}

	
	static render(context: vscode.ExtensionContext, contextSelection?: vscode.Uri, _allSelections?: vscode.Uri[]) {
		if (EmulatorPanel.instance) {
			EmulatorPanel.instance.panel.reveal(vscode.ViewColumn.One);
		} else {
			EmulatorPanel.instance = new EmulatorPanel(context);
		}

		// always update the webview content when creating or revealing
		// todo: load disc using messages rather than html changes. this way the script can reset the emulator, or optionally auto-boot
		EmulatorPanel.instance.setDiscFileUrl(contextSelection);
		if (contextSelection) {
			console.log('setting html');
			// TODO: pass message to webview to update disc file
			EmulatorPanel.instance.panel.webview.html = EmulatorPanel.instance.getWebviewContent();
		}
	}
	

	private getWebviewContent() {
		const webview = this.panel.webview;
		const context = this.context;
		const JSBEEB_RESOURCES = getJsBeebResources(context, webview);
		console.log('JSBEEB_RESOURCES=' + JSON.stringify(JSBEEB_RESOURCES));
		const mainScriptUrl = scriptUrl(context, webview, ['main.js']).toString();
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
			window.JSBEEB_RESOURCES=${JSON.stringify(JSBEEB_RESOURCES)};
			window.JSBEEB_DISC="${this.discFileUrl}";
		 	console.log("Window JSBEEB_RESOURCES Config=" + window.JSBEEB_RESOURCES);
		</script>
		<script defer="defer" src="${mainScriptUrl}"></script>				
</head>
<body>

    <div id="emu_footer">
			<div id="emu_status"></div>
			<div id="coords"></div>
    </div>

		<div class="emulator" id="emulator">
			<canvas class="screen" display="block" height="512px" id="screen" width="640px" tabindex="1"></canvas>
    </div>

Hello world<br>
You selected disc file '${this.discFileUrl}'<br>

<h1>Heading1</h1>
<h2>Heading2</h2>
<h3>Heading3</h3>
<h4>Heading4</h4>
<h5>Heading5</h5>
<p>Paragraph</p>
<code>Code</code>
<pre>Pre</pre>
<button>Button</button>
<button>⏵</button>
<button>⏸</button>
<button>⏹</button>


<img src="${ scriptUrl(context, webview, ['images', 'test-card.webp']) }">

</body>
</html>`;		
	}		
}
