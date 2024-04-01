import {
  CompletionItemKind,
  Uri,
  Position,
  CompletionList,
  commands,
} from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

suite('Should do completion', () => {
  const docUri = getDocUri('completion.6502')

  test('Completes BeebASM keywords', async () => {
    await testCompletion(docUri, new Position(0, 0), {
      items: [
        { label: 'PRINT', kind: CompletionItemKind.Method },
        { label: 'STRING$', kind: CompletionItemKind.Function },
      ],
    })
  })
})

async function testCompletion(
  docUri: Uri,
  position: Position,
  expectedCompletionList: CompletionList,
) {
  await activate(docUri)

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position,
  )) as CompletionList

  assert.ok(actualCompletionList.items.length >= 2)
  // check list contains each of the expected items
  expectedCompletionList.items.forEach((expectedItem, _i) => {
    assert.ok(
      actualCompletionList.items.some(
        (item) => item.label === expectedItem.label,
      ),
    )
  })
}
