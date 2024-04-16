import { Uri, Position, WorkspaceEdit, TextEdit, commands } from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

suite('Should do rename', () => {
  const docUri = getDocUri('rename.6502')

  test('Rename symbols and labels', async () => {
    await testRename(docUri, new Position(0, 2), 'newSymbol')
    await testRename(docUri, new Position(6, 6), 'newLabel')
  })
})

// rename.6502 file contents:
// 0 symbol = %01001010
// 1 ORG &1000
// 2 .label
// 3 {
// 4 	LDA #symbol
// 5 	CMP &80
// 6 	BEQ label
// 7 }

async function testRename(docUri: Uri, position: Position, newname: string) {
  await activate(docUri)

  const prepareRenameEdits = (await commands.executeCommand(
    'vscode.prepareRename',
    docUri,
    position,
  )) as Range | null

  assert.ok(prepareRenameEdits)

  const actualWorkspaceEdits = (await commands.executeCommand(
    'vscode.executeDocumentRenameProvider',
    docUri,
    position,
    newname,
  )) as WorkspaceEdit

  assert.equal(actualWorkspaceEdits.entries().length, 1)
  const edits: TextEdit[] = actualWorkspaceEdits.entries()[0][1]
  // check list contains reference to new name
  assert.equal(edits.length, 2)
  assert.equal(edits[0].newText, newname)
}
