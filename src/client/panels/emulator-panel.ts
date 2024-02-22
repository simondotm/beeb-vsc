import * as vscode from 'vscode';
import { getJsBeebResources, scriptUri, scriptUrl } from '../emulator/assets';

export class EmulatorPanel {
	public static currentPanel: EmulatorPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _context: vscode.ExtensionContext;
	private _disposables: vscode.Disposable[] = [];
	private _discFileUrl: string = '';

	private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
		this._context = context;
		this._panel = panel;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);		

		this._panel.webview.html = this._getWebviewContent();		
	}


	public dispose() {
		EmulatorPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	public setDiscFileUrl(discFile?: vscode.Uri) {	
		this._discFileUrl = discFile ? this._panel.webview.asWebviewUri(discFile).toString() : '';
	}

	
	public static render(context: vscode.ExtensionContext, contextSelection?: vscode.Uri, allSelections?: vscode.Uri[]) {
		if (EmulatorPanel.currentPanel) {
			console.log('revealing existing panel');
			EmulatorPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
		} else {
			console.log('creating new panel');

			const localResourceRoots =  [
				// localUri(context, []),
				//contextSelection,
				vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : context.extensionUri,
				scriptUri(context, []),
				scriptUri(context, ['images']),
				scriptUri(context, ['jsbeeb']),
				scriptUri(context, ['jsbeeb', 'roms']),
				scriptUri(context, ['jsbeeb', 'sounds']),
			];

			console.log('localResourceRoots=' + JSON.stringify(localResourceRoots));

			const panel = vscode.window.createWebviewPanel(
				'emulator',
				'JSBeeb',
				vscode.ViewColumn.One, {
					enableScripts: true,			
					retainContextWhenHidden: true, // Retain state when hidden		
					// Only allow the webview to access specific resources in our extension's dist folder
					localResourceRoots,
				}
			);

			EmulatorPanel.currentPanel = new EmulatorPanel(context, panel);
			EmulatorPanel.currentPanel._panel.webview.html = EmulatorPanel.currentPanel._getWebviewContent();
		}


		// always update the webview content when creating or revealing
		EmulatorPanel.currentPanel.setDiscFileUrl(contextSelection);
		if (contextSelection) {
			console.log('setting html');
			// TODO: pass message to webview to update disc file
			EmulatorPanel.currentPanel._panel.webview.html = EmulatorPanel.currentPanel._getWebviewContent();
		}
	}
	

	private _getWebviewContent() {
		const webview = this._panel.webview;
		const context = this._context;
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
			window.JSBEEB_DISC="${this._discFileUrl}";
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
You selected disc file '${this._discFileUrl}'<br>

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

    <div class="toolbar" id="emu_toolbar">
        <button data-action="run" title="Run the program (ctrl-enter)"><i class="fa-solid fa-play" style="pointer-events: none;"></i></button>
        <button data-action="new" title="Start a new program"><i class="fa-solid fa-file" style="pointer-events: none;"></i></button>
                <button class="save" data-action="save" title="Save memory from the emulator" data-toggle="tooltip" data-placement="top" title="Save memory from the emulator"><i class="fa-solid fa-memory" style="pointer-events: none;"></i></button>
        <button data-action="share" title="Share your code as a URL, disc or tape image"><i class="fa-solid fa-share-square" style="pointer-events: none;"></i></button>

    </div>
    <div class="toolbar" id="editor_toolbar">
        <button data-action="emulator" id="screen-button" title="View emulator (ctrl-enter)">
            <div data-action="emulator" id="play-pause"></div>
        </button>
        <button data-action="examples" id="examples-button" title="Load examples">examples</button>
        <button data-action="about" id="about-button" title="About OwletEditor">about</button>
    </div>
    <div class="code-editor" id="editor"></div>

			<div id="about" class="text-light">
					<img alt="Owlet logo" src="../assets/images/owlet.png" width="10%"/>
					<h3>Owlet Editor - beta</h3>
					<p>A simple, modern editor for retro coding in BBC BASIC (1981) inspired by <a
									href="https://www.bbcmicrobot.com">BBC Micro Bot</p>
					<p>Created by <a href="https://mastodon.me.uk/@Dominic">Dominic Pajak</a> and
							<a href="https://twitter.com/mattgodbolt">Matt Godbolt</a>.
							Contribute source and submit issues on <a href="https://github.com/mattgodbolt/owlet-editor">GitHub</a>.
					</p>
					<p>With thanks to the Bitshifters Collective, Kweepa, P_Malin, Rheolism, and the whole BBC Micro bot
							community.</p>
					<p>&nbsp;</p>
					<p><img alt="BBC Micro bot logo" src="../assets/images/monster.png" width="16px"/> Check out the <a href="https://www.bbcmicrobot.com">BBC Micro Bot gallery </a></p>

			</div>

</body>
</html>`;		
	}		
}
