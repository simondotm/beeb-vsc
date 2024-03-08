import * as vscode from 'vscode'
import { getJsBeebResources, scriptUri, scriptUrl } from '../emulator/assets'
import {
  ClientCommand,
  ClientMessage,
  DiscImageFile,
  HostCommand,
  HostMessage,
  NO_DISC,
} from '../../types/shared/messages'
import { isDev, isFeatureEnabled } from '../../types/shared/config'
import { relative } from 'path'

const glob = '**/*.{ssd,dsd}'

export class EmulatorPanel {
  static instance: EmulatorPanel | undefined

  private readonly panel: vscode.WebviewPanel
  private readonly context: vscode.ExtensionContext
  private disposables: vscode.Disposable[] = []

  private discImageFile: DiscImageFile = NO_DISC

  private watcher: vscode.FileSystemWatcher | undefined

  private constructor(context: vscode.ExtensionContext) {
    this.context = context

    this.panel = vscode.window.createWebviewPanel(
      'emulator',
      'JSBeeb',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true, // Retain state when hidden
        // Only allow the webview to access specific resources in our extension's dist folder
        localResourceRoots: [
          // localUri(context, []),
          //contextSelection,
          vscode.workspace.workspaceFolders
            ? vscode.workspace.workspaceFolders[0].uri
            : context.extensionUri,
          scriptUri(context, []),
          scriptUri(context, ['images']),
          scriptUri(context, ['jsbeeb']),
          scriptUri(context, ['jsbeeb', 'roms']),
          scriptUri(context, ['jsbeeb', 'sounds']),
        ],
      },
    )
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
    this.setWebviewMessageListener(this.panel.webview)
    this.panel.webview.html = this.getWebviewContent()

    // Update client with view state changes
    this.panel.onDidChangeViewState((e) => {
      this.notifyClient({
        command: HostCommand.ViewFocus,
        focus: {
          active: e.webviewPanel.active,
          visible: e.webviewPanel.visible,
        },
      })
    })
  }

  /**
   * Start watching for disc images in the workspace
   * and notify the client of any changes
   * This process begins once the client reports the page has loaded
   */
  private startWatcher() {
    // Watch workspace for disc images
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]
    if (workspaceRoot) {
      this.sendDiscImages(workspaceRoot)

      this.watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, glob),
      )

      // notify client when a disk image file has changed
      this.watcher.onDidChange((uri) => {
        this.notifyClient({
          command: HostCommand.DiscImageChanges,
          changed: [this.discImageFileFromUri(uri)],
        })
      })
      // update client with all disc image files in the workspace when added
      this.watcher.onDidCreate((uri) => {
        this.sendDiscImages(workspaceRoot)
        this.notifyClient({
          command: HostCommand.DiscImageChanges,
          created: [this.discImageFileFromUri(uri)],
        })
      })
      // update client with all disc image files in the workspace when deleted
      this.watcher.onDidDelete((uri) => {
        this.sendDiscImages(workspaceRoot)
        this.notifyClient({
          command: HostCommand.DiscImageChanges,
          deleted: [this.discImageFileFromUri(uri)],
        })
      })
    }
  }

  /**
   * Notify client of all disc image files in the workspace
   * @param _workspaceRoot
   */
  private sendDiscImages(_workspaceRoot: vscode.WorkspaceFolder) {
    vscode.workspace.findFiles(glob).then((uris) => {
      console.log(`found uris:`, uris)
      const allFiles: DiscImageFile[] = uris.map((uri) => {
        return this.discImageFileFromUri(uri)
      })
      console.log(`found files:`, allFiles)
      this.notifyClient({
        command: HostCommand.DiscImages,
        discImages: allFiles,
      })
    })
  }

  private dispose() {
    EmulatorPanel.instance = undefined

    if (this.watcher) {
      this.watcher.dispose()
    }

    this.panel.dispose()

    while (this.disposables.length) {
      const disposable = this.disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }

  private setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      (message: ClientMessage) => {
        const command = message.command
        // const text = message.text;

        switch (command) {
          case ClientCommand.PageLoaded:
            vscode.window.showInformationMessage('loaded page')
            return
          case ClientCommand.EmulatorReady:
            // when the client side emulator signals it is ready
            // we can send it the default disc image file to load (if any)
            console.log('EmulatorReady')
            this.loadDisc()
            // start watching for disc image files in the workspace
            this.startWatcher()
            return
          case ClientCommand.Error:
            vscode.window.showInformationMessage(
              `${message.text ?? 'An error occurred'}`,
            )
            return
        }
      },
      undefined,
      this.disposables,
    )
  }

  setDiscFileUrl(discFile?: vscode.Uri) {
    this.discImageFile = discFile
      ? this.discImageFileFromUri(discFile)
      : NO_DISC
    console.log('setDiscFileUrl=' + this.discImageFile)
  }

  loadDisc() {
    this.notifyClient({
      command: HostCommand.LoadDisc,
      discImageFile: this.discImageFile,
    })
  }

  /**
   * Return DiscImageFile (web url and image name) for the given uri
   * @param uri
   * @returns DiscImageFile
   */
  discImageFileFromUri(uri: vscode.Uri): DiscImageFile {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]
    return {
      url: this.panel.webview.asWebviewUri(uri).toString(),
      name: workspaceRoot
        ? relative(workspaceRoot.uri.fsPath, uri.fsPath)
        : uri.fsPath,
    }
  }

  /**
   * Send the given message to the client
   * @param message
   */
  notifyClient(message: HostMessage) {
    this.panel.webview.postMessage(message).then((result) => {
      if (!result) {
        vscode.window.showInformationMessage(
          `Failed to send message to webview: ${JSON.stringify(message)}`,
        )
      }
    })
  }

  static show(
    context: vscode.ExtensionContext,
    contextSelection?: vscode.Uri,
    _allSelections?: vscode.Uri[],
  ) {
    if (EmulatorPanel.instance) {
      EmulatorPanel.instance.panel.reveal(vscode.ViewColumn.One)

      // notify the client of a disc selection if emulator was
      // launched via a file context menu
      if (contextSelection) {
        EmulatorPanel.instance.setDiscFileUrl(contextSelection)
        EmulatorPanel.instance.loadDisc()
      }
    } else {
      EmulatorPanel.instance = new EmulatorPanel(context)

      // notify the client of a disc selection if emulator was
      // launched via a file context menu
      if (contextSelection) {
        EmulatorPanel.instance.setDiscFileUrl(contextSelection)
      }
    }
  }

  private getWebviewContent() {
    const webview = this.panel.webview
    const context = this.context
    const JSBEEB_RESOURCES = getJsBeebResources(context, webview)
    const mainScriptUrl = scriptUrl(context, webview, ['main.js']).toString()
    if (isDev()) {
      console.log('JSBEEB_RESOURCES=' + JSON.stringify(JSBEEB_RESOURCES))
      console.log('mainScriptUrl=' + mainScriptUrl)
    }
    const codiconsUrl = scriptUrl(context, webview, [
      'css',
      'codicon.css',
    ]).toString()
    const cssUrl = scriptUrl(context, webview, ['css', 'styles.css']).toString()
    // <script nonce="${getNonce()}" defer="defer" src="${mainScriptUrl}"></script>

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>JSBeeb</title>
          <script type='text/javascript'>
            window.JSBEEB_RESOURCES=${JSON.stringify(JSBEEB_RESOURCES)};
            ${isDev() ? 'console.log("Window JSBEEB_RESOURCES Config=" + window.JSBEEB_RESOURCES);' : ''}
          </script>
          <script defer="defer" src="${mainScriptUrl}"></script>		
          <link href="${codiconsUrl}" rel="stylesheet" />		
          <link href="${cssUrl}" rel="stylesheet" />		
      </head>
      <body>

          ${isFeatureEnabled('emulatorToolBar') ? this.getToolbarHtml() : ''}
          ${this.getEmulatorHtml()}
          ${this.getInfoBarHtml()}
          ${this.getFooterHtml()}
          ${this.getAudioWarningHtml()}

          ${isDev() ? this.getTestHtml() : ''}

      </body>
      </html>
    `
  }

  getToolbarHtml() {
    return `
      <div id="toolbar">

        <vscode-button id="toolbar-control" appearance="secondary">
          <span class="codicon codicon-debug-start"></span>
        </vscode-button>

        <vscode-button id="toolbar-restart" appearance="secondary">
          <span class="codicon codicon-debug-restart"></span>
        </vscode-button>


        <vscode-dropdown id="model-selector">
          <span slot="indicator" class="codicon codicon-vm"></span>
        </vscode-dropdown>

        <vscode-dropdown id="disc-selector" class="fixed-width-selector">
          <span slot="indicator" class="codicon codicon-save"></span>
        </vscode-dropdown>

        <vscode-button id="toolbar-sound" appearance="secondary">
          <span class="codicon codicon-unmute"></span>
        </vscode-button>

        <vscode-button id="toolbar-expand" appearance="secondary">
          <span class="codicon codicon-screen-normal"></span>
        </vscode-button>

        <vscode-divider></vscode-divider>

      </div>		
		`
  }

  getEmulatorHtml() {
    return `
      <div id="emulator" class="emulator-container">
        <canvas id="screen" width="720px" height="576px" tabindex="1"></canvas>
        <img id="testcard" src="${scriptUrl(this.context, this.panel.webview, ['images', 'test-card.webp'])}" hidden>
      </div>
		`
  }

  getInfoBarHtml() {
    return `
      <div id="infobar">
        <vscode-button id="infobar-runtime" appearance="secondary">⌀</vscode-button>
        <vscode-button id="infobar-mode" appearance="secondary">⌀</vscode-button>
        <vscode-button id="infobar-text-coords" appearance="secondary">⌀</vscode-button>
        <vscode-button id="infobar-graphics-coords" appearance="secondary">⌀</vscode-button>
      </div>
    `
  }

  getFooterHtml() {
    return `
      <div class="footer"><h5>Powered by <vscode-link href="https://github.com/mattgodbolt/jsbeeb">JSBeeb</vscode-link></h5></div>      
    `
  }

  getAudioWarningHtml() {
    return `
      <vscode-button id="audio-warning" appearance="primary" hidden>
        <span class="codicon codicon-warning"></span>
        &nbsp;Audio is disabled in this webview. Click to enable.
      </vscode-button>    
    `
  }

  getTestHtml() {
    return ''
    return `

Hello world<br>
You selected disc file '${this.discImageFile}'<br>

<vscode-divider></vscode-divider>

<vscode-button id="howdy">Howdy!</vscode-button>

<vscode-divider></vscode-divider>

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

<vscode-divider></vscode-divider>

	<vscode-dropdown>
		<vscode-option>Option Label #1</vscode-option>
		<vscode-option>Option Label #2</vscode-option>
		<vscode-option>Option Label #3</vscode-option>
	</vscode-dropdown>

<vscode-divider></vscode-divider>

<vscode-button appearance="primary">Button Text</vscode-button>
<vscode-button appearance="secondary">Button Text</vscode-button>
<vscode-button appearance="icon">
  <span class="codicon codicon-check"></span>
</vscode-button>

<vscode-divider></vscode-divider>

<div>div1</div>
<div>div2</div>
<div>div3</div>

<vscode-divider></vscode-divider>

<div class="no-margin">div1</div>
<div class="no-margin">div2</div>
<div class="no-margin">div3</div>

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
		`
  }
}
