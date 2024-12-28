import { Uri, Position, commands } from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

suite('Should get references', () => {
  const docUri = getDocUri('rename.6502')

  test('Get references for symbols and labels', async () => {
    await testFindReferences(docUri, new Position(0, 2), 2)
    await testFindReferences(docUri, new Position(6, 6), 2)
  })
})

// rename.6502 file contents:
// 0 symbol = %01001010
// 1 ORG &1000
// 2 .label ; comment
// 3 {
// 4 	LDA #symbol
// 5 	CMP &80
// 6 	BEQ label
// 7 }

async function testFindReferences(
  docUri: Uri,
  position: Position,
  numRefs: number,
) {
  await activate(docUri)

  const actualReferences = (await commands.executeCommand(
    'vscode.executeReferenceProvider',
    docUri,
    position,
  )) as Location[]

  assert.equal(actualReferences.length, numRefs)
}
