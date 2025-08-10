import * as assert from 'assert'
import { suite, test } from 'mocha'

import { LineParser } from '../beebasm-ts/lineparser'
import { SourceCode } from '../beebasm-ts/sourcecode'
import * as AsmException from '../beebasm-ts/asmexception'
import {
  Diagnostic,
  DocumentLink,
  TextDocumentPositionParams,
} from 'vscode-languageserver'
import { GlobalData } from '../beebasm-ts/globaldata'
import { SymbolTable } from '../beebasm-ts/symboltable'
import { ObjectCode } from '../beebasm-ts/objectcode'
import { CompletionProvider, SignatureProvider } from '../completions'
import { FindDefinition, FindReferences } from '../symbolhandler'
import { MacroTable } from '../beebasm-ts/macro'
import * as AST from '../ast'
import { InlayHintsProvider } from '../inlayhintsprovider'

const diagnostics = new Map<string, Diagnostic[]>()
const trees = new Map<string, AST.AST[]>()
const links = new Map<string, DocumentLink[]>()
// fixture to reset symbol table
beforeEach(function () {
  SymbolTable.Instance.Reset()
  MacroTable.Instance.Reset()
  ObjectCode.Instance.Reset()
  GlobalData.Instance.ResetForId()
  GlobalData.Instance.SetPass(0)
  diagnostics.set('', [])
})

// Helpers
function Run2Passes(code: string) {
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
    input.Process()
  }
}

suite('LineParser', function () {
  suite('Assignments', function () {
    test('test symbol assignment number', testSymbolAssignmentNumber)
    test('test symbol assignment string', testSymbolAssignmentString)
    test('test symbol assignment hex', testSymbolAssignmentHex)
    test(
      'test symbol assignment multistatement',
      testSymbolAssignmentMultistatement,
    )
    test('test symbol assignment updated', testSymbolAssignmentUpdated)
    test('test symbol assignment invalid', testSymbolAssignmentInvalid)
  })

  suite('Labels', function () {
    test('test symbol top level label', testLabelAllGlobalLevels)
    test('test symbol reassignment', testLabelReassigned)
    test('test inner label', testInnerLabel)
    test('Test 2 pass', test2Pass)
    test('Test symbol location', testSymbolLocation)
    test('Test find reference to label', testFindReferenceToLabel)
    test('Test find reference to nested label', testFindReferenceToNestedLabel)
    test('Test macro naming', testMacroNaming)
    test('Test macro body', testMacroBody)
    test(
      'Test forward reference with decrement',
      testForwardReferenceWithDecrement,
    )
    test('Test failing forward reference', testFailingForwardReference)
    test('Test labels where there is a FOR loop', testLabelsWithForLoop)
  })

  suite('Braces', function () {
    test('test mismatched braces', testMismatchedBraces)
  })

  suite('Handlers', function () {
    test('test labeled skip and org', testSkipAndOrg)
    test('test for loop', testForLoop)
    test('test for level', testForLevel)
    test('test conditional', testConditional)
  })

  suite('Assembly', function () {
    test('RTS', testAssembler1)
    test('Reference error', testReferenceError)
    test('Indirect', testIndirect)
    test('Absolute X', testAbsoluteX)
    test('Mapped char expr', testMappedCharExpr)
  })

  suite('Functions', function () {
    test('LO function', testLOFunction)
    test('Eval shift left', testEvalShiftLeft)
    test('TIME$', testTIME$)
    test('Expressionless ERROR', testExpressionlessERROR)
    test('Divide by zero from function', testMacroError)
    test('MapChar', testMapChar)
  })

  suite('Completions', function () {
    test('Test completions', testCompletions)
  })

  suite('Symbol features', function () {
    test('Test symbol reference', testSymbolReference)
    test('Test local symbol reference', testLocalSymbolReference)
    test('Test repeated for symbol', testRepeatedForSymbol)
    test('Test multiple files', testMultipleFiles)
  })

  suite('Commands', function () {
    test('Test assert fails', testAssertFails)
    test('Test assert passes', testAssertPasses)
    test('Test assert string concat', testAssertStringConcat)
  })

  suite('Signatures', function () {
    test('Test find function name', testFindFunctionName)
    test('Test find function name CHR$', testFindFunctionNameCHR$)
    test('Test find function name MID$', testFindFunctionNameMID$)
    test('Test not function in comments', testNotFunctionInComments)
  })

  suite('AST', function () {
    test('Test assign to value', testASTAssign)
    test('Test assign to expression evaluation', testASTAssignExpr)
    test('Test command', testASTCommand)
    test('Test assign command', testASTAssignCommand)
    test('Test 2 expressions', testAST2Expressions)
    test('Test assembler 1', testASTAssembler1)
    test('Test assembler 2', testASTAssembler2)
    test('Test assembler 3', testASTAssembler3)
    test('Test mode ACC', testASTModeACC)
    test('Test mode INDX', testASTModeINDX)
    test('Test mode IND16X', testASTModeIND16X)
    test('Test EQUB', testASTEQUB)
    test('Test 1-line For loop', testASTForLoop)
    test('Test multi-line For loop', testASTForLoopMultipleLines)
    test('Test Macro call', testASTMacroCall)
  })

  suite('SourceMap', function () {
    test('Test source map 1 byte', testSourceMapInfo1Byte)
    test('Test source map 2 bytes', testSourceMapInfo2Byte)
    test('Test source map 3 bytes', testSourceMapInfo3Byte)
    test(
      'Test multiple statements on line',
      testSourceMapInfoMultipleStatements,
    )
    test('Test inside of for loop', testSourcMapInfoForLoop)
    test('Test inside macro call', testSourceMapInfoInsideMacro)
    test(
      'Test inside macro with preceding code',
      SourceMapInfoInsideMacroWithOffset,
    )
  })

  suite('InlayHintsProvider', function () {
    test('Test easiest case', testInlayHintEasy)
    test('Test short value after opcode', testInlayHintShortValue)
    test('Test long value after opcode', testInlayHintLongValue)
    test('Test expression with function', testInlayHintExpressionWithFunction)
    test('Test numerical expression', testInlayHintNumericalExpression)
    test('Test label reference', testInlayHintLabelReference)
    test('Test expression with labels', testInlayHintExpressionWithLabels)
    test('Test multiple statements on line', testInlayHintMultipleStatements)
    test('Test comment after opcode', testInlayHintCommentAfterStatement)
  })
})

const assignments = `
a = 10
b = 20: d=30
c = "hello"
old = 0
old = 1
wrongun = £
oswrch = &FFEE
`

function testSymbolAssignmentNumber() {
  const sourceCode = new SourceCode(
    assignments,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  const parser = new LineParser(sourceCode, sourceCode.GetLine(1), 1)
  parser.Process()
  const [_found, result] = sourceCode.GetSymbolValue('a')
  assert.equal(result, 10)
}

function testSymbolAssignmentString() {
  const sourceCode = new SourceCode(
    assignments,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  const parser = new LineParser(sourceCode, sourceCode.GetLine(3), 3)
  parser.Process()
  const [_found, result] = sourceCode.GetSymbolValue('c')
  assert.equal(result, 'hello')
}

function testSymbolAssignmentHex() {
  const sourceCode = new SourceCode(
    assignments,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  const parser = new LineParser(sourceCode, sourceCode.GetLine(7), 7)
  parser.Process()
  const [_found, result] = sourceCode.GetSymbolValue('oswrch')
  assert.equal(result, 0xffee)
}

function testSymbolAssignmentMultistatement() {
  const sourceCode = new SourceCode(
    assignments,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  const parser = new LineParser(sourceCode, sourceCode.GetLine(2), 2)
  parser.Process()
  const [_found1, result1] = sourceCode.GetSymbolValue('b')
  assert.equal(result1, 20)
  const [_found2, result2] = sourceCode.GetSymbolValue('d')
  assert.equal(result2, 30)
}

function testSymbolAssignmentUpdated() {
  const sourceCode = new SourceCode(
    assignments,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  const parser1 = new LineParser(sourceCode, sourceCode.GetLine(4), 4)
  const parser2 = new LineParser(sourceCode, sourceCode.GetLine(5), 5)
  parser1.Process()
  try {
    parser2.Process()
  } catch (e) {
    if (e instanceof AsmException.SyntaxError_LabelAlreadyDefined) {
      assert.equal(e.message, 'Symbol already defined.')
      assert.equal(e._line, sourceCode.GetLine(5))
      assert.equal(e._column, 0)
    }
  }
}

function testSymbolAssignmentInvalid() {
  const sourceCode = new SourceCode(
    assignments,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  const parser = new LineParser(sourceCode, sourceCode.GetLine(6), 6)
  try {
    parser.Process()
  } catch (e) {
    if (e instanceof AsmException.SyntaxError_InvalidCharacter) {
      assert.equal(e.message, 'Bad expression.')
      assert.equal(e._line, sourceCode.GetLine(6))
      assert.equal(e._column, 10)
    }
  }
}

const labels = `
.loop
{
.inner
.^above
.*global
}
.loop`

function testLabelAllGlobalLevels() {
  const sourceCode = new SourceCode(
    labels,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  const [found1, _result1] = sourceCode.GetSymbolValue('loop')
  assert.equal(found1, true)
  const [found2, _result2] = sourceCode.GetSymbolValue('above')
  assert.equal(found2, true)
  const [found3, _result3] = sourceCode.GetSymbolValue('global')
  assert.equal(found3, true)
  assert.equal(diagnostics.get('')!.length, 1) // .loop is a duplicate label
}

function testInnerLabel() {
  // need to parse line by line and stop inside the braces for symbol search to work
  const sourceCode = new SourceCode(
    labels,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  for (let i = 0; i < 4; i++) {
    const parser = new LineParser(sourceCode, sourceCode.GetLine(i), i)
    parser.Process()
  }
  const [found, _result] = sourceCode.GetSymbolValue('inner')
  assert.equal(found, true)
}

function test2Pass() {
  const code = 'a = 1'
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
    input.Process()
  }
  assert.equal(diagnostics.get('')!.length, 0)
}

function testLabelReassigned() {
  const sourceCode = new SourceCode(
    labels,
    1,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()

  const lastError = diagnostics.get('')!.pop()
  assert.equal(lastError!.message, 'Symbol already defined.')
  assert.equal(lastError!.range.start.line, 7)
  assert.equal(lastError!.range.start.character, 0)
}

function testFindReferenceToLabel() {
  const code = `
JSR pressed_left
.pressed_left`
  Run2Passes(code)
  const res = FindReferences(code.split('\n')[2], '', { line: 2, character: 4 })
  assert.equal(res!.length, 1)
  assert.equal(res![0].range.start.line, 1)
  assert.equal(res![0].range.start.character, 4)
}

function testFindReferenceToNestedLabel() {
  const code = `{
JSR pressed_left
.pressed_left}`
  Run2Passes(code)
  const res = FindReferences(code.split('\n')[2], '', { line: 2, character: 4 })
  assert.equal(res!.length, 1)
  assert.equal(res![0].range.start.line, 1)
  assert.equal(res![0].range.start.character, 4)
}

function testMultipleFiles() {
  const code1 = '{ a = 1 }'
  const code2 = '{ a = 2 }'
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input1 = new SourceCode(
      code1,
      0,
      null,
      diagnostics,
      'file1',
      trees,
      links,
    )
    input1.Process()
    const input2 = new SourceCode(
      code2,
      0,
      null,
      diagnostics,
      'file2',
      trees,
      links,
    )
    input2.Process()
  }
  // check definition
  const [symbol1, _fullname1] = SymbolTable.Instance.GetSymbolByLine(
    'a',
    'file1',
    0,
  )
  assert.equal(symbol1?.GetValue(), 1)
  const [symbol2, _fullname2] = SymbolTable.Instance.GetSymbolByLine(
    'a',
    'file2',
    0,
  )
  assert.equal(symbol2?.GetValue(), 2)
}

function testMacroNaming() {
  const code = `
MACRO ADDI8 addr, val
  IF val=1
    INC addr
  ELIF val>1
    CLC
    LDA addr
    ADC #val
    STA addr
  ENDIF
ENDMACRO
`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0)
  // getting error in vscode after changing code i.e. need to parse again
  SymbolTable.Instance.Reset()
  MacroTable.Instance.Reset()
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0)
}

function testMacroBody() {
  const code = `
MACRO TEMP a
  PRINT a
ENDMACRO`
  Run2Passes(code)
  const body = MacroTable.Instance.Get('TEMP')?.GetBody()
  assert.equal(body, '\nPRINT a\n')
}

function testMismatchedBraces() {
  const sourceCode = new SourceCode('}', 0, null, diagnostics, '', trees, links)
  try {
    sourceCode.Process()
  } catch (e) {
    if (e instanceof AsmException.SyntaxError_MismatchedBraces) {
      assert.equal(e.message, 'Mismatched braces.')
      assert.equal(e._line, sourceCode.GetLine(0))
      assert.equal(e._column, 1)
    }
  }
}

function testForwardReferenceWithDecrement() {
  const code = `
LDA addr-1,Y
.addr skip 2`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0)
}

function testFailingForwardReference() {
  const code = `
.sprite_table
EQUB LO(red_sprite), HI(red_sprite)
.vertical_address

ALIGN &100
.red_sprite
EQUB 0,0,1,1,3,3,3,3
`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0, diagnostics.get('')![0]?.message)
}

function testLabelsWithForLoop() {
  const code = `ORG &2000
.start
LDA #2
FOR i, 1, 10
    LDA i
NEXT
.loop
CPY #0
BEQ exit
DEY
JMP loop
.exit
RTS
.end

PUTTEXT "BOOT.txt", "!BOOT", &FFFF
SAVE "code", start, end`
  Run2Passes(code)
  const labels = SymbolTable.Instance.GetAllLabels()
  console.log(labels)

  // check labels contains '.start', '.loop', '.exit', '.end'
  assert.ok(labels['.start'] !== undefined)
  assert.ok(labels['.loop'] !== undefined)
  assert.ok(labels['.exit'] !== undefined)
  assert.ok(labels['.end'] !== undefined)
}

function testSkipAndOrg() {
  const code = `
	ORG &20
	.label skip 1
	`
  try {
    for (let pass = 0; pass < 2; pass++) {
      GlobalData.Instance.SetPass(pass)
      ObjectCode.Instance.InitialisePass()
      GlobalData.Instance.ResetForId()
      const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
      input.Process()
    }
  } catch (e) {
    if (e instanceof AsmException.SyntaxError_MismatchedBraces) {
      assert.fail(e.message)
    } else {
      throw e
    }
  }
  assert.equal(diagnostics.get('')!.length, 0)
  const pc = ObjectCode.Instance.GetPC()
  assert.equal(pc, 0x21)
}

function testForLoop() {
  const code = `
	FOR n, 0, 10
	LDA #n
	NEXT`
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
    input.Process()
  }
  assert.equal(diagnostics.get('')!.length, 0, diagnostics.get('')![0]?.message)
}

function testForLevel() {
  // For stack pointer not getting reset if NEXT on same line as FOR
  const code = `
FOR i, 0, 1: PRINT i: NEXT
INCLUDE "dumm"`
  const sourceCode = new SourceCode(
    code,
    0,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  const forLevel = sourceCode.GetForLevel()
  assert.equal(forLevel, 0)
}

function testConditional() {
  const code = `
\\ build a rather strange table
FOR n, 0, 9
	IF (n AND 1) = 0
	a = n*n
	ELSE
	a = -n*n
	ENDIF
	EQUB a
NEXT`
  const sourceCode = new SourceCode(
    code,
    0,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

function testAssembler1() {
  const code = 'RTS'
  const sourceCode = new SourceCode(
    code,
    0,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

function testIndirect() {
  const code = 'LDA (&70), Y'
  const sourceCode = new SourceCode(
    code,
    0,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

function testAbsoluteX() {
  const code = 'ORA &12,X'
  const sourceCode = new SourceCode(
    code,
    0,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

function testMappedCharExpr() {
  const code = "SBC#'0'-1"
  const sourceCode = new SourceCode(
    code,
    0,
    null,
    diagnostics,
    '',
    trees,
    links,
  )
  sourceCode.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

function testReferenceError() {
  const code = `
	.layout skip 11*11
	LDA layout, Y
	`
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
    input.Process()
  }
  assert.equal(diagnostics.get('')!.length, 0)
}

function testLOFunction() {
  const code = 'LDA #LO(640)'
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
    input.Process()
  }
  assert.equal(diagnostics.get('')!.length, 0, diagnostics.get('')![0]?.message)
}

function testSymbolLocation() {
  const code = 'a=1: b=2: c=3'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const syms = SymbolTable.Instance.GetSymbols()
  let loc = syms.get('a')!.GetLocation()
  assert.equal(loc.range.start.character, 0)
  assert.equal(loc.range.end.character, 1)
  loc = syms.get('b')!.GetLocation()
  assert.equal(loc.range.start.character, 5)
  assert.equal(loc.range.end.character, 6)
}

// TODO - add tests for: label position and macro position, similar to symbol position

function testMacroError() {
  const code = `
MACRO LOG_ALIGN al
IF (al - (P% MOD al)) MOD al > 12
PRINT CALLSTACK$, " : Skipping",al - (P% AND (al - 1)),"at",~P%
ENDIF
ALIGN al
ENDMACRO`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

function testMapChar() {
  const code = "MAPCHAR ' ','Z', 32"
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  assert.equal(diagnostics.get('')!.length, 0)
}

async function testCompletions() {
  const completionHandler = new CompletionProvider()
  const pos: TextDocumentPositionParams = {
    textDocument: { uri: '' },
    position: { line: 0, character: 0 },
  }
  const completions = await completionHandler.onCompletion(pos)
  assert.notEqual(completions.length, 0)
}

function testSymbolReference() {
  const code = `
a=1
b=a
`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const currentLine: string = input.GetLine(2)
  const position = { line: 2, character: 2 }
  const result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 1)
  assert.equal(result!.range.start.character, 0)
  assert.equal(result!.range.end.line, 1)
  assert.equal(result!.range.end.character, 1)
}

function testLocalSymbolReference() {
  const code = `
{
a=1
b=a
{
c=1
}
}
FOR i, 0, 10
LDA #i
NEXT
{
d=2
}
 a=1
b=a
`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  // input.Process();
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
    input.Process()
  }
  // check for i within for loop
  let currentLine = input.GetLine(9)
  let position = { line: 9, character: 5 }
  let result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 8)
  assert.equal(result!.range.start.character, 4)
  // check for a within first block
  currentLine = input.GetLine(3)
  position = { line: 3, character: 2 }
  result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 2)
  assert.equal(result!.range.start.character, 0)
  // check for a within last block
  currentLine = input.GetLine(15)
  position = { line: 15, character: 2 }
  result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 14)
  assert.equal(result!.range.start.character, 1)
  // check for c within nested blocks
  currentLine = input.GetLine(5)
  position = { line: 5, character: 0 }
  result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 5)
  assert.equal(result!.range.start.character, 0)
}

function testRepeatedForSymbol() {
  const code = `
FOR n, 0, 10
    EQUW n
NEXT
FOR n, 0, 10
    EQUW n
NEXT`
  Run2Passes(code)

  // Check with cursor before first n
  let currentLine = code.split('\n')[2]
  let position = { line: 2, character: 9 }
  let result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(
    result!.range.start.line,
    1,
    'Expected line 1 but got ' + result!.range.start.line + '',
  )
  assert.equal(result!.range.start.character, 4)

  // Check with cursor after first n
  currentLine = code.split('\n')[2]
  position = { line: 2, character: 10 }
  result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 1)
  assert.equal(result!.range.start.character, 4)

  // Check with cursor before second n
  currentLine = code.split('\n')[5]
  position = { line: 5, character: 9 }
  result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 4)
  assert.equal(result!.range.start.character, 4)

  // Check with cursor after second n
  currentLine = code.split('\n')[5]
  position = { line: 5, character: 10 }
  result = FindDefinition(currentLine, '', position)
  assert.notEqual(result, null)
  assert.equal(result!.range.start.line, 4)
  assert.equal(result!.range.start.character, 4)
}

function testAssertFails() {
  const code = `
ASSERT 1==2
`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 1)
}

function testAssertPasses() {
  const code = `
ASSERT 1==1
`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0)
}

function testAssertStringConcat() {
  const code = `
foo = "Foo"
bar = "Bar"
ASSERT foo + " " + bar == "Foo Bar"
`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0, diagnostics.get('')![0]?.message)
}

function testEvalShiftLeft() {
  // Samples generated by running beebasm code
  const code = `
a = -128 << -3
b = 7283 << 2
c = 29658 << -2
d = -1583 << 3`
  Run2Passes(code)
  const a = SymbolTable.Instance.GetSymbols().get('a')?.GetValue()
  assert.equal(a, -16)
  const b = SymbolTable.Instance.GetSymbols().get('b')?.GetValue()
  assert.equal(b, 29132)
  const c = SymbolTable.Instance.GetSymbols().get('c')?.GetValue()
  assert.equal(c, 7414)
  const d = SymbolTable.Instance.GetSymbols().get('d')?.GetValue()
  assert.equal(d, -12664)
}

function testTIME$() {
  const code = `
ASSERT TIME$ == TIME$("%a,%d %b %Y.%H:%M:%S")`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0, diagnostics.get('')![0]?.message)
}

function testExpressionlessERROR() {
  const code = `
ERROR`
  Run2Passes(code)
  assert.equal(diagnostics.get('')!.length, 0, diagnostics.get('')![0]?.message)
}

function testFindFunctionName() {
  const code = 'PRINT "Hello World"'
  const provider = new SignatureProvider()
  const [match, parameterNo] = provider.findMatchingFunction(code, 5)
  assert.equal(match, 'PRINT')
  assert.equal(parameterNo, 0)
}

function testFindFunctionNameCHR$() {
  const code = 'CHR$(65)'
  const provider = new SignatureProvider()
  const [match, parameterNo] = provider.findMatchingFunction(code, 6)
  assert.equal(match, 'CHR$')
  assert.equal(parameterNo, 0)
}

function testFindFunctionNameMID$() {
  const code = 'MID$("Hello", 2, 3)'
  const provider = new SignatureProvider()
  const [match1, parameterNo1] = provider.findMatchingFunction(code, 5)
  assert.equal(match1, 'MID$')
  assert.equal(parameterNo1, 0)
  const [match2, parameterNo2] = provider.findMatchingFunction(code, 13)
  assert.equal(match2, 'MID$')
  assert.equal(parameterNo2, 1)
  const [match3, parameterNo3] = provider.findMatchingFunction(code, 16)
  assert.equal(match3, 'MID$')
  assert.equal(parameterNo3, 2)
}

function testNotFunctionInComments() {
  const code = 'PRINT "Hello World" ; PRINT "Goodbye World"'
  const provider = new SignatureProvider()
  const [match, _parameterNo] = provider.findMatchingFunction(code, 27)
  assert.equal(match, '')
}

function testASTAssign() {
  const code = 'a=1'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration)
  assert.equal(tree.children.length, 1)
  assert.equal(tree.children[0].children[0].type, AST.ASTType.Value)
  assert.equal(tree.children[0].children[0].value, 1)
}

function testASTAssignExpr() {
  const code = 'a=SIN(1+2)'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration)
  assert.equal(tree.children.length, 1)
  const outerFunc = tree.children[0].children[0]
  assert.equal(outerFunc.type, AST.ASTType.UnaryOp)
  const innerExpr = outerFunc.children[0]
  assert.equal(innerExpr.type, AST.ASTType.BinaryOp)
}

function testASTCommand() {
  const code = ' PRINT CHR$(6)'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  const thisLine = new LineParser(input, code, 0)
  thisLine.Process()
  const tree = thisLine.GetTree()
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].type, AST.ASTType.Command)
  assert.equal(tree.children[0].children[0].type, AST.ASTType.UnaryOp)
}

function testASTAssignCommand() {
  const code = 'a=CHR$(6)'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  const thisLine = new LineParser(input, code, 0)
  thisLine.Process()
  const tree = thisLine.GetTree()
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration)
  assert.equal(tree.children[0].children[0].type, AST.ASTType.UnaryOp)
}

function testAST2Expressions() {
  const code = 'a=1: b=a' // `a=1: b=2`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children.length, 3)
  assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration)
  assert.equal(tree.children[1].type, AST.ASTType.Command) // Separator (:)
  assert.equal(tree.children[2].type, AST.ASTType.VariableDeclaration)
}

function testASTAssembler1() {
  const code = 'RTS'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children.length, 1)
  assert.equal(tree.children[0].type, AST.ASTType.Assembly)
  assert.equal(tree.children[0].children.length, 0)
}

function testASTAssembler2() {
  const code = 'LDA #1'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children.length, 1)
  assert.equal(tree.children[0].type, AST.ASTType.Assembly)
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].children[0].type, AST.ASTType.Value)
  assert.equal(tree.children[0].children[0].value, 1)
}

function testASTAssembler3() {
  const code = 'JSR &FFEE'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children.length, 1)
  assert.equal(tree.children[0].type, AST.ASTType.Assembly)
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].children[0].type, AST.ASTType.Value)
  assert.equal(tree.children[0].children[0].value, '&FFEE')
}

function testASTModeACC() {
  const code = 'ASL A'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children.length, 1)
  assert.equal(tree.children[0].type, AST.ASTType.Assembly)
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].children[0].type, AST.ASTType.Value)
  assert.equal(tree.children[0].children[0].value, 'A')
}

function testASTModeINDX() {
  const code = 'LDA (&FF,X)'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children[0].children.length, 2)
  assert.equal(tree.children[0].children[0].value, '&FF')
  assert.equal(tree.children[0].children[1].value, 'X')
}

function testASTModeIND16X() {
  const code = `
CPU 1 ; set 65C02 mode as IND16,X is not supported on 6502
JMP (&1000,X)`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![2]
  assert.equal(tree.children[0].children.length, 2)
  assert.equal(tree.children[0].children[0].value, '&1000')
  assert.equal(tree.children[0].children[1].value, 'X')
}

function testASTEQUB() {
  const code = 'EQUB 1,2,3'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children[0].children.length, 3)
  assert.equal(tree.children[0].children[0].value, '1')
  assert.equal(tree.children[0].children[1].value, '2')
  assert.equal(tree.children[0].children[2].value, '3')
}

// For loops can be nested
// For loops can have FOR and NEXT on same line
// For loops can have instructions after the FOR
// Middle lines will get parsed multiple time, want to store AST only once
// linenumber gets set back FOR line -1 after NEXT, ready for looping back
// for type contains count which could be useful
function testASTForLoop() {
  const code = 'FOR n, 0, 1: EQUB n: NEXT'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children.length, 5) // includes statement separator
}

// TODO - doubly nested for loop worth testing (not just for AST)

function testASTForLoopMultipleLines() {
  const code = `FOR n, 0, 1
EQUB n
NEXT`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![0]
  assert.equal(tree.children[0].children.length, 2) // start and end range values
}

function testASTMacroCall() {
  const code = `
MACRO TEMP n
PRINT n
ENDMACRO
TEMP 1`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')![4]
  assert.equal(tree.children.length, 1)
}

function testSourceMapInfo1Byte() {
  const code = `
ORG &1900
DEX`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  const info = sourceMap[0x1900]
  // assert.equal(info?.file, 0) // Using hash function, could create index later if useful to interpret
  assert.equal(info?.line, 3)
  assert.equal(info?.column, 0)
  assert.equal(info?.parent, null)
}

function testSourceMapInfo2Byte() {
  const code = `
ORG &1900
LDA #1`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  const info = sourceMap[0x1900]
  assert.equal(info?.line, 3)
  assert.equal(info?.column, 0)
  assert.equal(info?.parent, null)
}

function testSourceMapInfo3Byte() {
  const code = `
ORG &1900
JSR &FFEE`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  const info = sourceMap[0x1900]
  assert.equal(info?.line, 3)
  assert.equal(info?.column, 0)
  assert.equal(info?.parent, null)
}

function testSourceMapInfoMultipleStatements() {
  const code = `
ORG &1900
LDA #10: STA &80`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  const info = sourceMap[0x1902]
  assert.equal(info?.line, 3)
  assert.equal(info?.column, 9)
  assert.equal(info?.parent, null)
}

function testSourcMapInfoForLoop() {
  const code = `
ORG &1900
FOR n, 0, 10
LDA #n
NEXT`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  let info = sourceMap[0x1900]
  assert.equal(info?.line, 4)
  info = sourceMap[0x1912]
  assert.equal(info?.line, 4)
}

function testSourceMapInfoInsideMacro() {
  const code = `
MACRO TEMP n
LDA #n
ENDMACRO
ORG &1900
TEMP 1`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  const info = sourceMap[0x1900]
  assert.equal(info?.line, 3)
}

// NB: For reverse source lookup, make sure store list of addresses for each line

function SourceMapInfoInsideMacroWithOffset() {
  const code = `
ORG &00
NOP
NOP
MACRO TEMP n
LDA #n
ENDMACRO
ORG &1900
TEMP 1`
  Run2Passes(code)
  const sourceMap = ObjectCode.Instance.GetSourceMap()
  const info = sourceMap[0x1900]
  assert.equal(info?.line, 6)
}

function testInlayHintEasy() {
  const code = 'INX'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 3, line: 0 })
}

function testInlayHintShortValue() {
  const code = 'LDA #1'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 6, line: 0 })
}

function testInlayHintLongValue() {
  const code = 'LDA #255'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 8, line: 0 })
}

function testInlayHintExpressionWithFunction() {
  const code = 'LDA #LO(640)'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 12, line: 0 })
}

function testInlayHintNumericalExpression() {
  const code = 'LDA 25 - 5'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 10, line: 0 })
}

function testInlayHintLabelReference() {
  const code = `ORG &100
LDA addr
ORG &1000
.addr`
  let input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  GlobalData.Instance.SetPass(1)
  ObjectCode.Instance.InitialisePass()
  GlobalData.Instance.ResetForId()
  input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(1, 1, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 8, line: 1 })
}

function testInlayHintExpressionWithLabels() {
  const code = `ORG &100
JMP addr1 + offset
ORG &1000
.addr1
offset = 100`
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(1, 1, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 18, line: 1 })
}

function testInlayHintMultipleStatements() {
  const code = 'INX: INY'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 2)
  assert.deepEqual(hints[0].position, { character: 3, line: 0 })
  assert.deepEqual(hints[1].position, { character: 8, line: 0 })
}

function testInlayHintCommentAfterStatement() {
  const code = 'LDA #0  ; comment'
  const input = new SourceCode(code, 0, null, diagnostics, '', trees, links)
  input.Process()
  const tree = input.GetTrees().get('')!
  const provider = new InlayHintsProvider(input.GetTrees())
  const hints = provider.GetHintsForLineRange(0, 0, tree, '', code)
  assert.equal(hints.length, 1)
  assert.deepEqual(hints[0].position, { character: 6, line: 0 })
}
