import * as assert from 'assert';
import { suite, test, it } from 'mocha';

import { LineParser } from '../beebasm-ts/lineparser';
import { SourceCode } from '../beebasm-ts/sourcecode';
import * as AsmException from '../beebasm-ts/asmexception';
import { Diagnostic, DocumentLink, TextDocumentPositionParams } from 'vscode-languageserver';
import { GlobalData } from '../beebasm-ts/globaldata';
import { SymbolTable } from '../beebasm-ts/symboltable';
import { ObjectCode } from '../beebasm-ts/objectcode';
import { CompletionProvider, SignatureProvider } from '../completions';
import { FindDefinition, FindReferences } from '../symbolhandler';
import { MacroTable } from '../beebasm-ts/macro';
import * as AST from '../ast';

const diagnostics = new Map<string, Diagnostic[]>();
const trees = new Map<string, AST.AST[]>();
const links = new Map<string, DocumentLink[]>();
// fixture to reset symbol table
beforeEach(function () {
	SymbolTable.Instance.Reset();
	MacroTable.Instance.Reset();
	ObjectCode.Instance.Reset();
	GlobalData.Instance.ResetForId();
	GlobalData.Instance.SetPass(0);
	diagnostics.set("", []);
});

// Helpers
function Run2Passes(code: string) {
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
		input.Process();
	}
}

suite('LineParser', function () {
	setup(function () {
		// ...
	});

	suite('Assignments', function () {
		test('test symbol assignment number', function () {
			testSymbolAssignmentNumber();
		});
		test('test symbol assignment string', function () {
			testSymbolAssignmentString();
		});
		test('test symbol assignment hex', function () {
			testSymbolAssignmentHex();
		});
		test('test symbol assignment multistatement', function () {
			testSymbolAssignmentMultistatement();
		});
		test('test symbol assignment updated', function () {
			testSymbolAssignmentUpdated();
		});
		test('test symbol assignment invalid', function () {
			testSymbolAssignmentInvalid();
		});
	});

	suite('Labels', function () {
		test('test symbol top level label', function () {
			testLabelAllGlobalLevels();
		});
		test('test symbol reassignment', function () {
			testLabelReassigned();
		});
		test('test inner label', function () {
			testInnerLabel();
		});
		test('Test 2 pass', function () {
			test2Pass();
		});
		test('Test symbol location', function () {
			testSymbolLocation();
		});
		test('Test find reference to label', function () {
			testFindReferenceToLabel();
		});
		test('Test find reference to nested label', function () {
			testFindReferenceToNestedLabel();
		});
		test('Test macro naming', function () {
			testMacroNaming();
		});
		test('Test forward reference with decrement', function () {
			testForwardReferenceWithDecrement();
		});
		test('Test failing forward reference', function () {
			testFailingForwardReference();
		});
	});

	suite('Braces', function () {
		test('test mismatched braces', function () {
			testMismatchedBraces();
		});
	});

	suite('Handlers', function () {
		test('test labeled skip and org', function () {
			testSkipAndOrg();
		});
		test('test for loop', function () {
			testForLoop();
		});
		test('test for level', function () {
			testForLevel();
		});
		test('test conditional', function () {
			testConditional();
		});
	});

	suite('Assembly', function () {
		test('RTS', function () {
			testAssembler1();
		});
		test('Reference error', function () {
			testReferenceError();
		});
		test('Indirect', function () {
			testIndirect();
		});
		test('Absolute X', function () {
			testAbsoluteX();
		});
		test('Mapped char expr', function () {
			testMappedCharExpr();
		});
	});

	suite('Functions', function () {
		test('LO function', function () {
			testLOFunction();
		});
		test('Eval shift left', function () {
			testEvalShiftLeft();
		});
		test('TIME$', function () {
			testTIME$();
		});
		test('Expressionless ERROR', function () {
			testExpressionlessERROR();
		});
		test('Divide by zero from function', function () {
			testMacroError();
		});
		test('MapChar', function () {
			testMapChar();
		});
	});

	suite('Completions', function () {
		test('Test completions', async function () {
			await testCompletions();
		});
	});

	suite('Symbol features', function () {
		test('Test symbol reference', function () {
			testSymbolReference();
		});
		test('Test local symbol reference', function () {
			testLocalSymbolReference();
		});
		test('Test repeated for symbol', function () {
			testRepeatedForSymbol();
		});
	});

	suite('Commands', function () {
		test('Test assert fails', function () {
			testAssertFails();
		});
		test('Test assert passes', function () {
			testAssertPasses();
		});
		test('Test assert string concat', function () {
			testAssertStringConcat();
		});
	});

	suite('Signatures', function () {
		test('Test find function name', function () {
			testFindFunctionName();
		});
		test('Test find function name CHR$', function () {
			testFindFunctionNameCHR$();
		});
		test('Test find function name MID$', function () {
			testFindFunctionNameMID$();
		});
	});

	suite('AST', function () {
		test('Test assign to value', function () {
			testASTAssign();
		});
		test('Test assign to expression evaluation', function () {
			testASTAssignExpr();
		});
		test('Test command', function () {
			testASTCommand();
		});
		test('Test assign command', function () {
			testASTAssignCommand();
		});
		test('Test 2 expressions', function () {
			testAST2Expressions();
		});
		test('Test assembler 1', function () {
			testASTAssembler1();
		});
		test('Test assembler 2', function () {
			testASTAssembler2();
		});
		test('Test assembler 3', function () {
			testASTAssembler3();
		});
		test('Test mode ACC', function () {
			testASTModeACC();
		});
		test('Test mode INDX', function () {
			testASTModeINDX();
		});
		test('Test mode IND16X', function () {
			testASTModeIND16X();
		});
		test('Test EQUB', function () {
			testASTEQUB();
		});
		test('Test 1-line For loop', function () {
			testASTForLoop();
		});
		test('Test multi-line For loop', function () {
			testASTForLoopMultipleLines();
		});
	});
});

const assignments = `
a = 10
b = 20: d=30
c = "hello"
old = 0
old = 1
wrongun = £
oswrch = &FFEE
`;

function testSymbolAssignmentNumber() {
	const sourceCode = new SourceCode(assignments, 1, null, diagnostics, "", trees, links);
	const parser = new LineParser(sourceCode, sourceCode.GetLine(1), 1);
	let result: string | number = "";
	parser.Process();
	let found = false;
	[found, result] = sourceCode.GetSymbolValue("a");
	assert.equal(result, 10);
}

function testSymbolAssignmentString() {
	const sourceCode = new SourceCode(assignments, 1, null, diagnostics, "", trees, links);
	const parser = new LineParser(sourceCode, sourceCode.GetLine(3), 3);
	let result: string | number = "";
	parser.Process();
	let found = false;
	[found, result] = sourceCode.GetSymbolValue("c");
	assert.equal(result, "hello");
}

function testSymbolAssignmentHex() {
	const sourceCode = new SourceCode(assignments, 1, null, diagnostics, "", trees, links);
	const parser = new LineParser(sourceCode, sourceCode.GetLine(7), 7);
	let result: string | number = "";
	parser.Process();
	let found = false;
	[found, result] = sourceCode.GetSymbolValue("oswrch");
	assert.equal(result, 0xFFEE);
}


function testSymbolAssignmentMultistatement() {
	const sourceCode = new SourceCode(assignments, 1, null, diagnostics, "", trees, links);
	const parser = new LineParser(sourceCode, sourceCode.GetLine(2), 2);
	let result: string | number = "";
	parser.Process();
	let found = false;
	[found, result] = sourceCode.GetSymbolValue("b");
	assert.equal(result, 20);
	[found, result] = sourceCode.GetSymbolValue("d");
	assert.equal(result, 30);
}

function testSymbolAssignmentUpdated() {
	const sourceCode = new SourceCode(assignments, 1, null, diagnostics, "", trees, links);
	const parser1 = new LineParser(sourceCode, sourceCode.GetLine(4), 4);
	const parser2 = new LineParser(sourceCode, sourceCode.GetLine(5), 5);
	parser1.Process();
	try {
		parser2.Process();
	}
	catch (e) {
		if (e instanceof AsmException.SyntaxError_LabelAlreadyDefined) {
			assert.equal(e.message, "Symbol already defined.");
			assert.equal(e._line, sourceCode.GetLine(5));
			assert.equal(e._column, 0);
		}
	}
}

function testSymbolAssignmentInvalid() {
	const sourceCode = new SourceCode(assignments, 1, null, diagnostics, "", trees, links);
	const parser = new LineParser(sourceCode, sourceCode.GetLine(6), 6);
	try {
		parser.Process();
	}
	catch (e) {
		if (e instanceof AsmException.SyntaxError_InvalidCharacter) {
			assert.equal(e.message, "Bad expression.");
			assert.equal(e._line, sourceCode.GetLine(6));
			assert.equal(e._column, 10);
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
.loop`;

function testLabelAllGlobalLevels() {
	const sourceCode = new SourceCode(labels, 1, null, diagnostics, "", trees, links);
	sourceCode.Process();
	let found = false;
	let result: string | number = "";
	[found, result] = sourceCode.GetSymbolValue("loop");
	assert.equal(found, true);
	[found, result] = sourceCode.GetSymbolValue("above");
	assert.equal(found, true);
	[found, result] = sourceCode.GetSymbolValue("global");
	assert.equal(found, true);
	assert.equal(diagnostics.get("")!.length, 1); // .loop is a duplicate label
}

function testInnerLabel() {
	// need to parse line by line and stop inside the braces for symbol search to work
	const sourceCode = new SourceCode(labels, 1, null, diagnostics, "", trees, links);
	for (let i = 0; i < 4; i++) {
		const parser = new LineParser(sourceCode, sourceCode.GetLine(i), i);
		parser.Process();
	}
	let found = false;
	let result: string | number = "";
	[found, result] = sourceCode.GetSymbolValue("inner");
	assert.equal(found, true);
}

function test2Pass() {
	const code = `a = 1`;
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
		input.Process();
	}
	assert.equal(diagnostics.get("")!.length, 0);
}

function testLabelReassigned() {
	const sourceCode = new SourceCode(labels, 1, null, diagnostics, "", trees, links);
	sourceCode.Process();

	const lastError = diagnostics.get("")!.pop();
	assert.equal(lastError!.message, "Symbol already defined.");
	assert.equal(lastError!.range.start.line, 7);
	assert.equal(lastError!.range.start.character, 0);
}

function testFindReferenceToLabel() {
	const code = `
JSR pressed_left
.pressed_left`;
	Run2Passes(code);
	const res = FindReferences(code.split('\n')[2], { line: 2, character: 4 });
	assert.equal(res!.length, 1);
	assert.equal(res![0].range.start.line, 1);
	assert.equal(res![0].range.start.character, 4);
}

function testFindReferenceToNestedLabel() {
	const code = `{
JSR pressed_left
.pressed_left}`;
	Run2Passes(code);
	const res = FindReferences(code.split('\n')[2], { line: 2, character: 4 });
	assert.equal(res!.length, 1);
	assert.equal(res![0].range.start.line, 1);
	assert.equal(res![0].range.start.character, 4);
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
`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0);
	// getting error in vscode after changing code i.e. need to parse again
	SymbolTable.Instance.Reset();
	MacroTable.Instance.Reset();
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0);
}


function testMismatchedBraces() {
	const sourceCode = new SourceCode("}", 0, null, diagnostics, "", trees, links);
	try {
		sourceCode.Process();
	}
	catch (e) {
		if (e instanceof AsmException.SyntaxError_MismatchedBraces) {
			assert.equal(e.message, "Mismatched braces.");
			assert.equal(e._line, sourceCode.GetLine(0));
			assert.equal(e._column, 1);
		}
	}
}

function testForwardReferenceWithDecrement() {
	const code = `
LDA addr-1,Y
.addr skip 2`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0);
}

function testFailingForwardReference() {
	const code = `
.sprite_table
EQUB LO(red_sprite), HI(red_sprite)
.vertical_address

ALIGN &100
.red_sprite
EQUB 0,0,1,1,3,3,3,3
`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0, diagnostics.get("")![0]?.message);
}

function testSkipAndOrg() {
	const code = `
	ORG &20
	.label skip 1
	`;
	try {
		for ( let pass = 0; pass < 2; pass++ ) {
			GlobalData.Instance.SetPass(pass);
			ObjectCode.Instance.InitialisePass();
			GlobalData.Instance.ResetForId();
			const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
			input.Process();
		}
	}
	catch (e) {
		if (e instanceof AsmException.SyntaxError_MismatchedBraces) {
			assert.fail(e.message);
		}
		else {
			throw e;
		}
	}
	assert.equal(diagnostics.get("")!.length, 0);
	const pc = ObjectCode.Instance.GetPC();
	assert.equal(pc, 0x21);
}

function testForLoop() {
	const code = `
	FOR n, 0, 10
	LDA #n
	NEXT`;
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
		input.Process();
	}
	assert.equal(diagnostics.get("")!.length, 0, diagnostics.get("")![0]?.message);
}

function testForLevel() {
	// For stack pointer not getting reset if NEXT on same line as FOR
	const code = `
FOR i, 0, 1: PRINT i: NEXT
INCLUDE "dumm"`;
	const sourceCode = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	sourceCode.Process();
	const forLevel = sourceCode.GetForLevel();
	assert.equal(forLevel, 0);
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
NEXT`;
	const sourceCode = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	sourceCode.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

function testAssembler1() {
	const code = `RTS`;
	const sourceCode = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	sourceCode.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

function testIndirect() {
	const code = `LDA (&70), Y`;
	const sourceCode = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	sourceCode.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

function testAbsoluteX() {
	const code = `ORA &12,X`;
	const sourceCode = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	sourceCode.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

function testMappedCharExpr() {
	const code = `SBC#'0'-1`;
	const sourceCode = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	sourceCode.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

function testReferenceError() {
	const code = `
	.layout skip 11*11
	LDA layout, Y
	`;
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
		input.Process();
	}
	assert.equal(diagnostics.get("")!.length, 0);
}

function testLOFunction() {
	const code = `LDA #LO(640)`;
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
		input.Process();
	}
	assert.equal(diagnostics.get("")!.length, 0, diagnostics.get("")![0]?.message);
}

function testSymbolLocation() {
	const code = `a=1: b=2: c=3`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const syms = SymbolTable.Instance.GetSymbols();
	let loc = syms.get("a")!.GetLocation();
	assert.equal(loc.range.start.character, 0);
	assert.equal(loc.range.end.character, 1);
	loc = syms.get("b")!.GetLocation();
	assert.equal(loc.range.start.character, 5);
	assert.equal(loc.range.end.character, 6);
}

// TODO - add tests for: label position and macro position, similar to symbol position



function testMacroError() {
	const code = `
MACRO LOG_ALIGN al
IF (al - (P% MOD al)) MOD al > 12
PRINT CALLSTACK$, " : Skipping",al - (P% AND (al - 1)),"at",~P%
ENDIF
ALIGN al
ENDMACRO`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

function testMapChar() {
	const code = `MAPCHAR ' ','Z', 32`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	assert.equal(diagnostics.get("")!.length, 0);
}

// function asyncMethod() {
// 	return new Promise<CompletionItem[]>((resolve) => {
// 		setTimeout(() => {
// 			resolve();
// 		}, 1000);
// 	});
// }

// NOT WORKING - HAVE TO FIGURE OUT HOW TO TEST ASYNC
// Or just extract function and test that???
async function testCompletions() {
	const completionHandler = new CompletionProvider();
	const pos: TextDocumentPositionParams = { textDocument: { uri: "" }, position: { line: 0, character: 0 } };
	const completions = completionHandler.onCompletion(pos);
	let output;
	const temp = completions.then((result) => {
		output = result;
		assert.equal(output.length, 1);
	});
}

function testSymbolReference() {
	const code = `
a=1
b=a
`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const currentLine: string = input.GetLine(2);
	const position = { line: 2, character: 2 };
	const result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 1);
	assert.equal(result!.range.start.character, 0);
	assert.equal(result!.range.end.line, 1);
	assert.equal(result!.range.end.character, 1);
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
`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	// input.Process();
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
		input.Process();
	}
	// check for i within for loop
	let currentLine = input.GetLine(9);
	let position = { line: 9, character: 5 };
	let result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 8);
	assert.equal(result!.range.start.character, 4);
	// check for a within first block
	currentLine = input.GetLine(3);
	position = { line: 3, character: 2 };
	result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 2);
	assert.equal(result!.range.start.character, 0);
	// check for a within last block
	currentLine = input.GetLine(15);
	position = { line: 15, character: 2 };
	result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 14);
	assert.equal(result!.range.start.character, 1);
	// check for c within nested blocks
	currentLine = input.GetLine(5);
	position = { line: 5, character: 0 };
	result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 5);
	assert.equal(result!.range.start.character, 0);
}

function testRepeatedForSymbol() {
	const code = `
FOR n, 0, 10
    EQUW n
NEXT
FOR n, 0, 10
    EQUW n
NEXT`;
	Run2Passes(code);

	// Check with cursor before first n
	let currentLine = code.split('\n')[2];
	let position = { line: 2, character: 9 };
	let result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 1, "Expected line 1 but got " + result!.range.start.line + "");
	assert.equal(result!.range.start.character, 4);

	// Check with cursor after first n
	currentLine = code.split('\n')[2];
	position = { line: 2, character: 10 };
	result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 1);
	assert.equal(result!.range.start.character, 4);

	// Check with cursor before second n
	currentLine = code.split('\n')[5];
	position = { line: 5, character: 9 };
	result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 4);
	assert.equal(result!.range.start.character, 4);

	// Check with cursor after second n
	currentLine = code.split('\n')[5];
	position = { line: 5, character: 10 };
	result = FindDefinition(currentLine, position);
	assert.notEqual(result, null);
	assert.equal(result!.range.start.line, 4);
	assert.equal(result!.range.start.character, 4);

}

function testAssertFails() {
	const code = `
ASSERT 1==2
`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 1);
}

function testAssertPasses() {
	const code = `
ASSERT 1==1
`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0);
}

function testAssertStringConcat() {
	const code = `
foo = "Foo"
bar = "Bar"
ASSERT foo + " " + bar == "Foo Bar"
`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0, diagnostics.get("")![0]?.message);
}

function testEvalShiftLeft() {
	// Samples generated by running beebasm code
	const code = `
a = -128 << -3
b = 7283 << 2
c = 29658 << -2
d = -1583 << 3`;
	Run2Passes(code);
	const a = SymbolTable.Instance.GetSymbols().get("a")?.GetValue();
	assert.equal(a, -16);
	const b = SymbolTable.Instance.GetSymbols().get("b")?.GetValue();
	assert.equal(b, 29132);
	const c = SymbolTable.Instance.GetSymbols().get("c")?.GetValue();
	assert.equal(c, 7414);
	const d = SymbolTable.Instance.GetSymbols().get("d")?.GetValue();
	assert.equal(d, -12664);
}

function testTIME$() {
	const code = `
ASSERT TIME$ == TIME$("%a,%d %b %Y.%H:%M:%S")`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0, diagnostics.get("")![0]?.message);
}

function testExpressionlessERROR() {
	const code = `
ERROR`;
	Run2Passes(code);
	assert.equal(diagnostics.get("")!.length, 0, diagnostics.get("")![0]?.message);
}


function testFindFunctionName() {
	const code = `PRINT "Hello World"`;
	const provider = new SignatureProvider();
	const [match, parameterNo] = provider.findMatchingFunction(code, 6);
	assert.equal(match, "PRINT");
	assert.equal(parameterNo, 0);
}

function testFindFunctionNameCHR$() {
	const code = `CHR$(65)`;
	const provider = new SignatureProvider();
	const [match, parameterNo] = provider.findMatchingFunction(code, 6);
	assert.equal(match, "CHR$");
	assert.equal(parameterNo, 0);
}

function testFindFunctionNameMID$() {
	const code = `MID$("Hello", 2, 3)`;
	const provider = new SignatureProvider();
	let [match, parameterNo] = provider.findMatchingFunction(code, 5);
	assert.equal(match, "MID$");
	assert.equal(parameterNo, 0);
	[match, parameterNo] = provider.findMatchingFunction(code, 13);
	assert.equal(match, "MID$");
	assert.equal(parameterNo, 1);
	[match, parameterNo] = provider.findMatchingFunction(code, 16);
	assert.equal(match, "MID$");
	assert.equal(parameterNo, 2);
}

function testASTAssign() {
	const code = `a=1`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration);
	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].children[0].type, AST.ASTType.Value);
	assert.equal(tree.children[0].children[0].value, 1);
}

function testASTAssignExpr() {
	const code = `a=SIN(1+2)`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	// console.log(tree.children);
	assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration);
	assert.equal(tree.children.length, 1);
	const outerFunc = tree.children[0].children[0];
	// console.log(outerFunc);
	assert.equal(outerFunc.type, AST.ASTType.UnaryOp);
	const innerExpr = outerFunc.children[0];
	console.log(innerExpr);
	assert.equal(innerExpr.type, AST.ASTType.BinaryOp);
}

function testASTCommand() {
	const code = ` PRINT CHR$(6)`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	const thisLine = new LineParser(input, code, 0);
	thisLine.Process();
	const tree = thisLine.GetTree();
	console.log(tree.children);
	console.log(tree.children[0].children);
	console.log(tree.children[0].children[0].children);
	assert.equal(tree.children[0].children.length, 1);
	assert.equal(tree.children[0].type, AST.ASTType.Command);
	assert.equal(tree.children[0].children[0].type, AST.ASTType.UnaryOp);

}

function testASTAssignCommand() {
	const code = `a=CHR$(6)`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	const thisLine = new LineParser(input, code, 0);
	thisLine.Process();
	const tree = thisLine.GetTree();
	console.log(tree.children);
	console.log(tree.children[0].children);
	console.log(tree.children[0].children[0].children);
	assert.equal(tree.children[0].children.length, 1);
	assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration);
	assert.equal(tree.children[0].children[0].type, AST.ASTType.UnaryOp);

}

function testAST2Expressions() {
	const code = `a=1: b=a`; // `a=1: b=2`
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	assert.equal(tree.children.length, 3);
	assert.equal(tree.children[0].type, AST.ASTType.VariableDeclaration);
	assert.equal(tree.children[1].type, AST.ASTType.Command); // Separator (:)
	assert.equal(tree.children[2].type, AST.ASTType.VariableDeclaration);
	console.log(tree.children[2]);
}

function testASTAssembler1() {
	const code = `RTS`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, AST.ASTType.Assembly);
	assert.equal(tree.children[0].children.length, 0);
}

function testASTAssembler2() {
	const code = `LDA #1`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, AST.ASTType.Assembly);
	assert.equal(tree.children[0].children.length, 1);
	assert.equal(tree.children[0].children[0].type, AST.ASTType.Value);
	assert.equal(tree.children[0].children[0].value, 1);
}

function testASTAssembler3() {
	const code = `JSR &FFEE`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	console.log(tree.children[0].children[0]);
	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, AST.ASTType.Assembly);
	assert.equal(tree.children[0].children.length, 1);
	assert.equal(tree.children[0].children[0].type, AST.ASTType.Value);
	assert.equal(tree.children[0].children[0].value, "&FFEE");
}

function testASTModeACC() {
	const code = `ASL A`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	console.log(tree.children[0].children[0]);
	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, AST.ASTType.Assembly);
	assert.equal(tree.children[0].children.length, 1);
	assert.equal(tree.children[0].children[0].type, AST.ASTType.Value);
	assert.equal(tree.children[0].children[0].value, "A");
}

function testASTModeINDX() {
	const code = `LDA (&FF,X)`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	console.log(tree.children[0].children[0]);
	assert.equal(tree.children[0].children.length, 2);
	assert.equal(tree.children[0].children[0].value, "&FF");
	assert.equal(tree.children[0].children[1].value, "X");
}

function testASTModeIND16X() {
	const code = `
CPU 1 ; set 65C02 mode as IND16,X is not supported on 6502
JMP (&1000,X)`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![2];
	console.log(tree.children);
	console.log(tree.children[0].children[0]);
	assert.equal(tree.children[0].children.length, 2);
	assert.equal(tree.children[0].children[0].value, "&1000");
	assert.equal(tree.children[0].children[1].value, "X");
}

function testASTEQUB() {
	const code = `EQUB 1,2,3`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	console.log(tree.children[0].children);
	assert.equal(tree.children[0].children.length, 3);
	assert.equal(tree.children[0].children[0].value, '1');
	assert.equal(tree.children[0].children[1].value, '2');
	assert.equal(tree.children[0].children[2].value, '3');
}

// For loops can be nested
// For loops can have FOR and NEXT on same line
// For loops can have instructions after the FOR
// Middle lines will get parsed multiple time, want to store AST only once
// linenumber gets set back FOR line -1 after NEXT, ready for looping back
// for type contains count which could be useful
function testASTForLoop() {
	const code = `FOR n, 0, 1: EQUB n: NEXT`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	const tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	console.log(tree.children[0].children);
	assert.equal(tree.children.length, 5); // includes statement separator
}

// TODO - doubly nested for loop worth testing (not just for AST)

function testASTForLoopMultipleLines() {
	const code = `FOR n, 0, 1
EQUB n
NEXT`;
	const input = new SourceCode(code, 0, null, diagnostics, "", trees, links);
	input.Process();
	let tree = input.GetTrees().get("")![0];
	console.log(tree.children);
	console.log(tree.children[0].children);
	tree = input.GetTrees().get("")![1];
	console.log(tree.children);
	tree = input.GetTrees().get("")![2];
	console.log(tree.children);
	
}

