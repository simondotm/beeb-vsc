// Make sure plain-text BBC BASIC files are decoded with the encoding set for
// the bbcbasic language (ISO-8859-1 by default), so bytes &80-&FF survive.
//
// The [bbcbasic] files.encoding default only applies when VS Code opens a file
// fresh. A tab restored after a window reload keeps the encoding it was saved
// with, and a file opened before .bas meant BBC BASIC was read as UTF-8, so
// such documents are reloaded from disk here with the right encoding.

import * as vscode from 'vscode'

export const BBC_BASIC_LANGUAGE_ID = 'bbcbasic'

function wantedEncoding(document: vscode.TextDocument): string | undefined {
  return vscode.workspace
    .getConfiguration('files', {
      uri: document.uri,
      languageId: BBC_BASIC_LANGUAGE_ID,
    })
    .get<string>('encoding')
}

async function fixEncoding(document: vscode.TextDocument): Promise<void> {
  if (
    document.languageId !== BBC_BASIC_LANGUAGE_ID ||
    document.isUntitled ||
    document.isDirty
  ) {
    return
  }
  const encoding = wantedEncoding(document)
  if (!encoding || document.encoding === encoding) {
    return
  }
  try {
    // Reloads the (unmodified) document from disk with the given encoding
    await vscode.workspace.openTextDocument(document.uri, { encoding })
    console.log(
      `BeebVSC: reopened ${document.uri.fsPath} as ${encoding} (was ${document.encoding})`,
    )
  } catch (error) {
    console.error(
      `BeebVSC: could not reopen ${document.uri.fsPath} as ${encoding}`,
      error,
    )
  }
}

export function registerBasicEncoding(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(fixEncoding),
  )
  for (const document of vscode.workspace.textDocuments) {
    void fixEncoding(document)
  }
}
