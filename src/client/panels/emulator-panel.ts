import * as vscode from 'vscode';
import { getJsBeebResources, scriptUri, scriptUrl } from '../emulator/assets';
import { ClientCommand, HostCommand } from '../../types/shared/messages';

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
		this.setWebviewMessageListener(this.panel.webview);
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

	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message: any) => {
				const command = message.command;
				// const text = message.text;

				switch (command) {
				case ClientCommand.PageLoaded:
					vscode.window.showInformationMessage('loaded page');
					return;
				case ClientCommand.EmulatorReady:
					console.log('EmulatorReady');
					this.loadDisc();
					return;
				}
				
			},
			undefined,
			this.disposables
		);
	}


	setDiscFileUrl(discFile?: vscode.Uri) {	
		this.discFileUrl = discFile ? this.panel.webview.asWebviewUri(discFile).toString() : '';
		console.log('setDiscFileUrl=' + this.discFileUrl);
	}

	loadDisc() {
		this.panel.webview.postMessage({ command: HostCommand.LoadDisc, url: this.discFileUrl }).then((result) => { console.log('loadDisc result=' + result); });
	}

	
	static show(context: vscode.ExtensionContext, contextSelection?: vscode.Uri, _allSelections?: vscode.Uri[]) {
		if (EmulatorPanel.instance) {
			EmulatorPanel.instance.panel.reveal(vscode.ViewColumn.One);
		} else {
			EmulatorPanel.instance = new EmulatorPanel(context);
		}

		// always update the webview content when creating or revealing
		// todo: load disc using messages rather than html changes. this way the script can reset the emulator, or optionally auto-boot
		// EmulatorPanel.instance.setDiscFileUrl(contextSelection);
		if (contextSelection) {
			console.log('setting html');
			// TODO: pass message to webview to update disc file
			EmulatorPanel.instance.setDiscFileUrl(contextSelection);
			// EmulatorPanel.instance.panel.webview.html = EmulatorPanel.instance.getWebviewContent();
		}
	}
	

	private getWebviewContent() {
		const webview = this.panel.webview;
		const context = this.context;
		const JSBEEB_RESOURCES = getJsBeebResources(context, webview);
		console.log('JSBEEB_RESOURCES=' + JSON.stringify(JSBEEB_RESOURCES));
		const mainScriptUrl = scriptUrl(context, webview, ['main.js']).toString();
		console.log('mainScriptUrl=' + mainScriptUrl);
		const codiconsUrl = scriptUrl(context, webview, ['css', 'codicon.css']).toString();
		const cssUrl = scriptUrl(context, webview, ['css', 'styles.css']).toString();
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
		<link href="${codiconsUrl}" rel="stylesheet" />		
		<link href="${cssUrl}" rel="stylesheet" />		
</head>
<body>


  <span class="codicon codicon-check"></span>
	<div class="dropdown-container">
		<label for="model-selector2">Select Model</label>
		<vscode-dropdown id="model-selector2">
			<span slot="indicator" class="codicon codicon-vm"></span>
			<vscode-option>Option Label #1</vscode-option>
			<vscode-option>Option Label #2</vscode-option>
			<vscode-option>Option Label #3</vscode-option>
		</vscode-dropdown>
	</div>

	<vscode-dropdown id="model-selector">
		<span slot="indicator" class="codicon codicon-vm"></span>
	</vscode-dropdown>

	<vscode-dropdown>
		<vscode-option>Option Label #1</vscode-option>
		<vscode-option>Option Label #2</vscode-option>
		<vscode-option>Option Label #3</vscode-option>
	</vscode-dropdown>


    <div id="emu_footer">
			<div id="emu_status"></div>
			<div id="coords"></div>
    </div>

		<div class="emulator" id="emulator">
			<canvas class="screen" display="block" height="512px" id="screen" width="640px" tabindex="1"></canvas>
    </div>

Hello world<br>
You selected disc file '${this.discFileUrl}'<br>

<vscode-divider></vscode-divider>

<vscode-button id="howdy">Howdy!</vscode-button>

<vscode-divider></vscode-divider>

<vscode-button appearance="primary">Button Text</vscode-button>
<vscode-button appearance="secondary">Button Text</vscode-button>
<vscode-button appearance="icon">
  <span class="codicon codicon-check"></span>
</vscode-button>

<vscode-divider></vscode-divider>

<vscode-text-field readonly placeholder="Placeholder Text">
	Text Field Label
  <span slot="start" class="codicon codicon-git-merge"></span>
</vscode-text-field>

<vscode-divider></vscode-divider>

<vscode-text-field>
  Text Field Label
  <section slot="end" style="display:flex; align-items: center;">
    <vscode-button appearance="icon" aria-label="Match Case">
      <span class="codicon codicon-case-sensitive"></span>
    </vscode-button>
    <vscode-button appearance="icon" aria-label="Match Whole Word">
      <span class="codicon codicon-whole-word"></span>
    </vscode-button>
    <vscode-button appearance="icon" aria-label="Use Regular Expression">
      <span class="codicon codicon-regex"></span>
    </vscode-button>
  </section>
</vscode-text-field>

<vscode-divider></vscode-divider>

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
