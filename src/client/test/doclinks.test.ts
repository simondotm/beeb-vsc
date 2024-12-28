import { DocumentLink, Position, Uri, Range, commands } from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

suite('Should get document links', () => {
  const docUri = getDocUri('main.6502')

  test('Expected links', async () => {
    await testLinks(docUri, [
      {
        //Line 3: INCLUDE "completion.6502"
        range: toRange(3, 9, 3, 24),
      },
      {
        //Line 4: INCLUDE "diagnostics.6502"
        range: toRange(4, 9, 4, 25),
      },
      {
        //Line 5: INCLUDE "rename.6502"
        range: toRange(5, 9, 5, 20),
      },
    ])
  })
})

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new Position(sLine, sChar)
  const end = new Position(eLine, eChar)
  return new Range(start, end)
}

async function testLinks(docUri: Uri, expectedDocumentLinks: DocumentLink[]) {
  await activate(docUri)

  const actualLinks = (await commands.executeCommand(
    'vscode.executeLinkProvider',
    docUri,
  )) as DocumentLink[]

  assert.equal(actualLinks.length, expectedDocumentLinks.length)

  expectedDocumentLinks.forEach((expectedLink, _i) => {
    assert.ok(
      actualLinks.some(
        (item) =>
          item.range.start.line === expectedLink.range.start.line &&
          item.range.start.character === expectedLink.range.start.character &&
          item.range.end.line === expectedLink.range.end.line &&
          item.range.end.character === expectedLink.range.end.character,
      ),
    )
  })
}
