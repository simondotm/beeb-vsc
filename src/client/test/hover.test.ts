import { Hover, Position, Uri, commands, MarkdownString } from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

type HoverTest = {
  position: Position
  hovers: Hover[]
}

// symbol = %01001010
// ORG &1000
// .label ; comment
// {
// 	LDA #symbol
// 	CMP &80
// 	BEQ label
// }

suite('Should get hover information', () => {
  const docUri = getDocUri('rename.6502')

  test('Expected hovers', async () => {
    await testHovers(docUri, [
      {
        //Line 4: LDA #symbol"
        position: new Position(4, 6),
        hovers: [
          {
            contents: [
              new MarkdownString(
                '```beebasm' + '\n' + 'symbol = %01001010' + '\n```',
              ),
            ],
          },
        ],
      },
      {
        //Line 5: CMP &80
        position: new Position(5, 1),
        hovers: [
          {
            contents: [
              new MarkdownString(
                [
                  '## CMP',
                  '---',
                  'Compare  ',
                  'Operation: A - M  ',
                  'Addressing mode: a8  ',
                  'Opcode: $C5  ',
                  'Cycles: 3',
                  '---',
                  '|N|V|_|B|D|I|Z|C|',
                  '|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|',
                  '|N|-|-|-|-|-|Z|C|',
                ].join('\n'),
              ),
            ],
          },
        ],
      },
      {
        //Line 6: BEQ label
        position: new Position(6, 6),
        hovers: [
          {
            contents: [
              new MarkdownString(
                '```beebasm' + '\n' + '.label ; comment' + '\n```',
              ),
            ],
          },
        ],
      },
    ])
  })
})

async function testHovers(docUri: Uri, tests: HoverTest[]) {
  await activate(docUri)

  for (const expectedHover of tests) {
    const actualHovers = (await commands.executeCommand(
      'vscode.executeHoverProvider',
      docUri,
      expectedHover.position,
    )) as Hover[]
    assert.equal(actualHovers.length, expectedHover.hovers.length)
    console.log((actualHovers[0].contents[0] as MarkdownString).value)
    const actual = (actualHovers[0].contents[0] as MarkdownString).value
    const expected = (expectedHover.hovers[0].contents[0] as MarkdownString)
      .value
    assert.equal(actual, expected)
  }
}
