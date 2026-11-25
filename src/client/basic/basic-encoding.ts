// Keep plain-text BBC BASIC files in the encoding set for the bbcbasic
// language (ISO-8859-1 by default), so bytes &80-&FF survive a save.
//
// The [bbcbasic] files.encoding default only applies when VS Code opens a file
// fresh. A tab restored after a window reload keeps the encoding it was saved
// with, so such documents are reloaded from disk here with the right encoding.
//
// Other things can still reopen a file in another encoding afterwards, most
// often an .editorconfig with `charset = utf-8` for every file, which the
// EditorConfig extension applies each time the editor gets focus. Reading the
// file as UTF-8 does no harm by itself, but every byte that is not valid UTF-8
// becomes U+FFFD and is written out as that when the file is saved. So when a
// BBC BASIC document is in that state, warn and offer to fix the .editorconfig,
// and if it is saved anyway, keep a copy of the file from before the save and
// offer to put it back. (A save cannot be cancelled or held up for a question:
// VS Code gives save listeners 1.5 seconds and then saves regardless.)

import * as path from 'path'
import { createHash } from 'crypto'
import * as vscode from 'vscode'

export const BBC_BASIC_LANGUAGE_ID = 'bbcbasic'

const WARNINGS_SETTING = 'basicEncodingWarnings'
const REPLACEMENT_CHARACTER = '�'
const EDITORCONFIG_SECTION = [
  '# Plain-text BBC BASIC: keep bytes &80-&FF and trailing spaces exactly',
  '[*.bas]',
  'charset = latin1',
  'trim_trailing_whitespace = false',
]
const ENCODING_NAMES: Record<string, string> = {
  utf8: 'UTF-8',
  utf8bom: 'UTF-8 with BOM',
  utf16le: 'UTF-16 LE',
  utf16be: 'UTF-16 BE',
  iso88591: 'ISO 8859-1',
}

const FIX_EDITORCONFIG = 'Fix .editorconfig'
const REOPEN = 'Reopen as ISO 8859-1'
const DONT_ASK = "Don't Ask Again"
const RESTORE = 'Restore Original'

function isBasicFile(document: vscode.TextDocument): boolean {
  return document.languageId === BBC_BASIC_LANGUAGE_ID && !document.isUntitled
}

function wantedEncoding(document: vscode.TextDocument): string {
  return (
    vscode.workspace
      .getConfiguration('files', {
        uri: document.uri,
        languageId: BBC_BASIC_LANGUAGE_ID,
      })
      .get<string>('encoding') || 'iso88591'
  )
}

function encodingName(encoding: string): string {
  return ENCODING_NAMES[encoding] ?? encoding
}

function warningsEnabled(document: vscode.TextDocument): boolean {
  return vscode.workspace
    .getConfiguration('beebvsc', document.uri)
    .get<boolean>(WARNINGS_SETTING, true)
}

// Number of characters that could not be decoded in the document's current
// encoding, and so would be lost on save. Zero when it is in the wanted one.
function lostCharacters(document: vscode.TextDocument): number {
  if (
    !isBasicFile(document) ||
    document.encoding === wantedEncoding(document)
  ) {
    return 0
  }
  return document.getText().split(REPLACEMENT_CHARACTER).length - 1
}

function isValidUtf8(data: Uint8Array): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(data)
    return true
  } catch {
    return false
  }
}

// Reload an unmodified BBC BASIC document from disk in the wanted encoding
async function fixEncoding(document: vscode.TextDocument): Promise<void> {
  if (!isBasicFile(document) || document.isDirty) {
    return
  }
  const encoding = wantedEncoding(document)
  if (document.encoding === encoding) {
    return
  }
  const previous = document.encoding
  try {
    await vscode.workspace.openTextDocument(document.uri, { encoding })
    console.log(
      `BeebVSC: reopened ${document.uri.fsPath} as ${encoding} (was ${previous})`,
    )
  } catch (error) {
    console.error(
      `BeebVSC: could not reopen ${document.uri.fsPath} as ${encoding}`,
      error,
    )
  }
}

// The .editorconfig nearest to the file; its sections take precedence over
// those in .editorconfig files further up
async function findEditorConfig(
  uri: vscode.Uri,
): Promise<vscode.Uri | undefined> {
  let folder = vscode.Uri.joinPath(uri, '..')
  for (;;) {
    const candidate = vscode.Uri.joinPath(folder, '.editorconfig')
    try {
      await vscode.workspace.fs.stat(candidate)
      return candidate
    } catch {
      // not here, try the parent folder
    }
    const parent = vscode.Uri.joinPath(folder, '..')
    if (parent.path === folder.path) {
      return undefined
    }
    folder = parent
  }
}

// Add a [*.bas] section to the end of the nearest .editorconfig, where it
// overrides any charset set for these files by earlier sections
async function fixEditorConfig(
  document: vscode.TextDocument,
): Promise<boolean> {
  const file = await findEditorConfig(document.uri)
  if (!file) {
    vscode.window.showErrorMessage(
      `No .editorconfig file was found in the folders above ${path.basename(document.uri.path)}.`,
    )
    return false
  }
  const editorConfig = await vscode.workspace.openTextDocument(file)
  const eol = editorConfig.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
  const text = editorConfig.getText()
  let gap = ''
  if (text.length > 0) {
    gap = text.endsWith('\n') ? eol : eol + eol
  }
  const edit = new vscode.WorkspaceEdit()
  edit.insert(
    file,
    editorConfig.positionAt(text.length),
    gap + EDITORCONFIG_SECTION.join(eol) + eol,
  )
  if (
    !(await vscode.workspace.applyEdit(edit)) ||
    !(await editorConfig.save())
  ) {
    vscode.window.showErrorMessage(
      `Could not update ${vscode.workspace.asRelativePath(file)}.`,
    )
    return false
  }
  vscode.window.showInformationMessage(
    `Added a [*.bas] section with charset = latin1 to ${vscode.workspace.asRelativePath(file)}.`,
  )
  return true
}

async function reopen(document: vscode.TextDocument): Promise<void> {
  if (document.isDirty) {
    vscode.window.showErrorMessage(
      `${path.basename(document.uri.path)} has unsaved changes, so it cannot be reopened in another encoding. Run "File: Revert File" to discard them, then try again.`,
    )
    return
  }
  await fixEncoding(document)
}

class BasicEncodingGuard {
  // Documents already warned about while in their current, unsafe encoding
  private readonly warned = new Set<string>()
  // Copies of files taken just before an unsafe save, by document URI
  private readonly backups = new Map<string, vscode.Uri>()

  constructor(private readonly storage: vscode.Uri) {}

  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(async (document) => {
        await fixEncoding(document)
        this.check(document)
      }),
      vscode.workspace.onDidChangeTextDocument((event) =>
        this.check(event.document),
      ),
      vscode.workspace.onWillSaveTextDocument((event) => this.willSave(event)),
      vscode.workspace.onDidSaveTextDocument((document) =>
        this.didSave(document),
      ),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.warned.delete(document.uri.toString())
        this.backups.delete(document.uri.toString())
      }),
    )
    for (const document of vscode.workspace.textDocuments) {
      void fixEncoding(document).then(() => this.check(document))
    }
  }

  private check(document: vscode.TextDocument): void {
    const key = document.uri.toString()
    const lost = lostCharacters(document)
    if (lost === 0) {
      this.warned.delete(key)
      return
    }
    if (this.warned.has(key) || !warningsEnabled(document)) {
      return
    }
    this.warned.add(key)
    void this.warn(document, lost)
  }

  private async warn(
    document: vscode.TextDocument,
    lost: number,
  ): Promise<void> {
    const name = path.basename(document.uri.path)
    const characters = lost === 1 ? '1 character' : `${lost} characters`
    const choice = await vscode.window.showWarningMessage(
      `${name} was reopened as ${encodingName(document.encoding)}, for example by a charset setting in .editorconfig. ${characters} (bytes &80-&FF) could not be read and will be lost if you save it.`,
      FIX_EDITORCONFIG,
      REOPEN,
      DONT_ASK,
    )
    if (choice === FIX_EDITORCONFIG) {
      if (await fixEditorConfig(document)) {
        await reopen(document)
      }
    } else if (choice === REOPEN) {
      await reopen(document)
    } else if (choice === DONT_ASK) {
      await vscode.workspace
        .getConfiguration('beebvsc')
        .update(WARNINGS_SETTING, false, vscode.ConfigurationTarget.Global)
    }
  }

  private willSave(event: vscode.TextDocumentWillSaveEvent): void {
    const document = event.document
    if (lostCharacters(document) === 0 || !warningsEnabled(document)) {
      return
    }
    event.waitUntil(this.backUp(document))
  }

  private async backUp(document: vscode.TextDocument): Promise<void> {
    try {
      const original = await vscode.workspace.fs.readFile(document.uri)
      // Once saved as UTF-8 the file holds no undecodable bytes any more, and
      // the copy taken before that first save is the one worth keeping
      if (isValidUtf8(original)) {
        return
      }
      const folder = vscode.Uri.joinPath(this.storage, 'basic-backups')
      await vscode.workspace.fs.createDirectory(folder)
      const hash = createHash('sha1')
        .update(document.uri.toString())
        .digest('hex')
      const backup = vscode.Uri.joinPath(folder, `${hash}.bas`)
      await vscode.workspace.fs.writeFile(backup, original)
      this.backups.set(document.uri.toString(), backup)
    } catch (error) {
      console.error(
        `BeebVSC: could not back up ${document.uri.fsPath} before saving`,
        error,
      )
    }
  }

  private async didSave(document: vscode.TextDocument): Promise<void> {
    const key = document.uri.toString()
    const backup = this.backups.get(key)
    if (!backup) {
      return
    }
    this.backups.delete(key)
    const name = path.basename(document.uri.path)
    const choice = await vscode.window.showWarningMessage(
      `${name} was saved as ${encodingName(document.encoding)}, so its bytes &80-&FF were replaced with "${REPLACEMENT_CHARACTER}". A copy from before the save was kept. Restoring it undoes the changes in that save.`,
      RESTORE,
    )
    if (choice !== RESTORE) {
      return
    }
    try {
      await vscode.workspace.fs.writeFile(
        document.uri,
        await vscode.workspace.fs.readFile(backup),
      )
      await reopen(document)
    } catch (error) {
      vscode.window.showErrorMessage(
        `Could not restore ${name}: ${error instanceof Error ? error.message : String(error)}. The copy is at ${backup.fsPath}.`,
      )
    }
  }
}

export function registerBasicEncoding(context: vscode.ExtensionContext): void {
  new BasicEncodingGuard(context.globalStorageUri).register(context)
}
