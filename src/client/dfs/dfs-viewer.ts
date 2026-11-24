// Read-only custom editor that shows the catalogue and file contents of
// Acorn DFS .ssd and .dsd disk images.

import * as path from 'path'
import { randomBytes } from 'crypto'
import * as vscode from 'vscode'
import {
  BOOT_OPTIONS,
  DfsImage,
  DfsSide,
  formatAddress,
  parseDfsImage,
} from './dfs'

export const DFS_VIEWER_VIEW_TYPE = 'beebvsc.dfsViewer'

class DfsViewerProvider implements vscode.CustomReadonlyEditorProvider {
  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => undefined }
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    panel.webview.options = { enableScripts: true, localResourceRoots: [] }
    const fileName = path.basename(document.uri.path)
    try {
      const data = await vscode.workspace.fs.readFile(document.uri)
      const image = parseDfsImage(data, fileName)
      panel.webview.html = renderViewer(image, fileName)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      panel.webview.html = renderError(fileName, message)
    }
  }
}

export function registerDfsViewer(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      DFS_VIEWER_VIEW_TYPE,
      new DfsViewerProvider(),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
    vscode.commands.registerCommand(
      'beebvsc.dfsViewer.open',
      async (uri?: vscode.Uri) => {
        let imageUri = uri instanceof vscode.Uri ? uri : undefined
        if (!imageUri) {
          const selected = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'Acorn DFS disk images': ['ssd', 'dsd'] },
          })
          imageUri = selected?.[0]
        }
        if (imageUri) {
          await vscode.commands.executeCommand(
            'vscode.openWith',
            imageUri,
            DFS_VIEWER_VIEW_TYPE,
          )
        }
      },
    ),
  )
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  )
}

// Everything the webview script needs, with addresses pre-formatted and each
// side's bytes sent once as base64.
function toViewModel(side: DfsSide) {
  return {
    drive: side.drive,
    title: side.title,
    cycle: side.cycle,
    boot: `${side.bootOption} (${BOOT_OPTIONS[side.bootOption]})`,
    discSectors: side.discSectors,
    imageSectors: side.imageSectors,
    warnings: side.warnings,
    data: Buffer.from(side.data).toString('base64'),
    files: side.files.map((file) => ({
      name: `${file.directory}.${file.name}`,
      locked: file.locked,
      load: formatAddress(file.loadAddress),
      exec: formatAddress(file.execAddress),
      length: file.length,
      startSector: file.startSector,
      offset: file.offset,
      truncated: file.truncated,
    })),
  }
}

const STYLE = `
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 0 18px 24px; }
  h1 { font-size: 1.4em; margin: 18px 0 4px; }
  h2 { font-size: 1.1em; margin: 20px 0 6px; }
  .muted { color: var(--vscode-descriptionForeground); }
  .error, .warning { color: var(--vscode-editorWarning-foreground); }
  .summary { display: flex; flex-wrap: wrap; gap: 6px 24px; padding: 10px 0; border-bottom: 1px solid var(--vscode-panel-border); }
  .summary strong { font-weight: 600; }
  .tabs { display: flex; gap: 4px; margin-top: 12px; }
  .tabs button { font: inherit; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); border: none; padding: 4px 12px; cursor: pointer; }
  .tabs button.selected { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; font-family: var(--vscode-editor-font-family); }
  th, td { padding: 4px 10px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); white-space: nowrap; }
  th { color: var(--vscode-descriptionForeground); font-weight: 600; font-family: var(--vscode-font-family); }
  td.number { text-align: right; }
  tbody tr { cursor: pointer; }
  tbody tr:hover { background: var(--vscode-list-hoverBackground); }
  tbody tr.selected { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  pre { overflow: auto; padding: 12px; background: var(--vscode-textCodeBlock-background); font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); line-height: 1.4; }
`

function page(title: string, body: string, nonce?: string): string {
  const scriptSource = nonce ? `script-src 'nonce-${nonce}';` : ''
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; ${scriptSource}">
  <title>${escapeHtml(title)}</title>
  <style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`
}

function renderError(fileName: string, message: string): string {
  return page(
    fileName,
    `<h1>${escapeHtml(fileName)}</h1>
<p class="error">This file could not be read as an Acorn DFS disk image.</p>
<p class="muted">${escapeHtml(message)}</p>`,
  )
}

function renderViewer(image: DfsImage, fileName: string): string {
  const nonce = randomBytes(16).toString('base64')
  const model = JSON.stringify({
    format: image.format,
    sides: image.sides.map(toViewModel),
  }).replace(/</g, '\\u003c')

  return page(
    fileName,
    `<h1>${escapeHtml(fileName)}</h1>
<div class="tabs" id="tabs"></div>
<div class="summary" id="summary"></div>
<table>
  <thead><tr><th>File</th><th>Load</th><th>Exec</th><th>Length</th><th>Sector</th><th></th></tr></thead>
  <tbody id="files"></tbody>
</table>
<section id="details"></section>
<script nonce="${nonce}">
  const image = ${model}
  const tabs = document.getElementById('tabs')
  const summary = document.getElementById('summary')
  const filesBody = document.getElementById('files')
  const details = document.getElementById('details')

  function hex(value, width) {
    return value.toString(16).toUpperCase().padStart(width, '0')
  }

  function decodeBase64(text) {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  function hexDump(bytes) {
    const lines = []
    for (let offset = 0; offset < bytes.length; offset += 16) {
      const chunk = Array.from(bytes.subarray(offset, offset + 16))
      const hexBytes = chunk.map((byte) => hex(byte, 2)).join(' ').padEnd(47, ' ')
      const text = chunk.map((byte) => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.')).join('')
      lines.push(hex(offset, 6) + '  ' + hexBytes + '  ' + text)
    }
    return lines.join('\\n')
  }

  function addItem(parent, label, value) {
    const item = document.createElement('span')
    const name = document.createElement('strong')
    name.textContent = label + ':'
    item.append(name, document.createTextNode(' ' + value))
    parent.append(item)
  }

  function showFile(side, bytes, file, row) {
    filesBody.querySelectorAll('tr').forEach((item) => item.classList.remove('selected'))
    row.classList.add('selected')
    details.replaceChildren()

    const heading = document.createElement('h2')
    heading.textContent = ':' + side.drive + '.' + file.name + (file.locked ? ' (locked)' : '')
    details.append(heading)
    const properties = document.createElement('div')
    properties.className = 'summary'
    addItem(properties, 'Load', '&' + file.load)
    addItem(properties, 'Exec', '&' + file.exec)
    addItem(properties, 'Length', '&' + hex(file.length, 6) + ' (' + file.length + ' bytes)')
    addItem(properties, 'Start sector', '&' + hex(file.startSector, 3))
    details.append(properties)
    if (file.truncated) {
      const warning = document.createElement('p')
      warning.className = 'warning'
      warning.textContent = 'This file extends beyond the end of the image; only the bytes present are shown.'
      details.append(warning)
    }
    const preview = document.createElement('pre')
    const data = bytes.subarray(file.offset, file.offset + file.length)
    preview.textContent = data.length ? hexDump(data) : '(empty file)'
    details.append(preview)
  }

  function showSide(index) {
    const side = image.sides[index]
    const bytes = decodeBase64(side.data)
    tabs.querySelectorAll('button').forEach((button, i) => button.classList.toggle('selected', i === index))

    summary.replaceChildren()
    addItem(summary, 'Title', side.title || '(none)')
    addItem(summary, 'Files', side.files.length)
    addItem(summary, 'Boot option', side.boot)
    addItem(summary, 'Cycle', side.cycle)
    addItem(summary, 'Disc size', side.discSectors + ' sectors')
    addItem(summary, 'In image', side.imageSectors + ' sectors')
    side.warnings.forEach((text) => {
      const warning = document.createElement('div')
      warning.className = 'warning'
      warning.textContent = text
      summary.append(warning)
    })

    filesBody.replaceChildren()
    details.replaceChildren()
    if (!side.files.length) {
      const hint = document.createElement('p')
      hint.className = 'muted'
      hint.textContent = 'This side has no files.'
      details.append(hint)
    }
    side.files.forEach((file) => {
      const row = document.createElement('tr')
      ;[
        file.name,
        file.load,
        file.exec,
        hex(file.length, 6),
        hex(file.startSector, 3),
        file.locked ? 'L' : '',
      ].forEach((value) => {
        const cell = document.createElement('td')
        cell.textContent = value
        row.append(cell)
      })
      row.addEventListener('click', () => showFile(side, bytes, file, row))
      filesBody.append(row)
    })
  }

  if (image.sides.length > 1) {
    image.sides.forEach((side, index) => {
      const button = document.createElement('button')
      button.textContent = 'Drive ' + side.drive
      button.addEventListener('click', () => showSide(index))
      tabs.append(button)
    })
  }
  showSide(0)
</script>`,
    nonce,
  )
}
