import {
  DiagnosticSeverity,
  Position,
  Uri,
  Range,
  Diagnostic,
  languages,
} from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

suite('Should get diagnostics', () => {
  const docUri = getDocUri('diagnostics.6502')

  test('Common diagnostics', async () => {
    await testDiagnostics(docUri, [
      {
        message: 'Symbol not defined.',
        range: toRange(0, 0, 0, 11),
        severity: DiagnosticSeverity.Warning,
        source: 'vscode-beebasm',
      },
      {
        message: 'Immediate value too large.',
        range: toRange(1, 0, 1, 8),
        severity: DiagnosticSeverity.Warning,
        source: 'vscode-beebasm',
      },
      {
        message: 'Mismatched parentheses.',
        range: toRange(2, 0, 2, 7),
        severity: DiagnosticSeverity.Warning,
        source: 'vscode-beebasm',
      },
    ])
  })
})

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new Position(sLine, sChar)
  const end = new Position(eLine, eChar)
  return new Range(start, end)
}

async function testDiagnostics(docUri: Uri, expectedDiagnostics: Diagnostic[]) {
  await activate(docUri)

  const actualDiagnostics = languages.getDiagnostics(docUri).sort((a, b) => {
    return a.range.start.compareTo(b.range.start)
  })

  assert.equal(actualDiagnostics.length, expectedDiagnostics.length)

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i]
    assert.equal(actualDiagnostic.message, expectedDiagnostic.message)
    assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range)
    assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity)
  })
}
