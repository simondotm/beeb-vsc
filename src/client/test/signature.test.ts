import { Uri, Position, SignatureHelp, commands } from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

suite('Should do signature', () => {
  const docUri = getDocUri('completion.6502')
  // testsymbol = &6502
  // ORG &2000
  // .testlabel
  test('Provides signature help', async () => {
    await testSignatureHelp(docUri, new Position(1, 4), 'ORG address')
  })
})

async function testSignatureHelp(
  docUri: Uri,
  position: Position,
  expectedSignatureLabel: string,
) {
  await activate(docUri)

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualSignatureHelp = (await commands.executeCommand(
    'vscode.executeSignatureHelpProvider',
    docUri,
    position,
  )) as SignatureHelp

  assert.equal(actualSignatureHelp.signatures.length, 1)
  assert.equal(actualSignatureHelp.signatures[0].label, expectedSignatureLabel)
}
