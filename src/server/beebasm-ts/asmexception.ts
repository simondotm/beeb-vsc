/*************************************************************************************************/
/**
	Derived from asmexception.cpp/h

	Exception handling for the app


	Copyright (C) Rich Talbot-Watkins 2007 - 2012

	This file is part of BeebAsm.

	BeebAsm is free software: you can redistribute it and/or modify it under the terms of the GNU
	General Public License as published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.

	BeebAsm is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
	even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with BeebAsm, as
	COPYING.txt.  If not, see <http://www.gnu.org/licenses/>.
*/
/*************************************************************************************************/

export class SyntaxError extends Error {
	public _line: string;
	public _column: number;

	constructor(line: string, column: number) {
		super();
		this._line = line;
		this._column = column;
	}
}

export class SyntaxError_NumberTooBig extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NumberTooBig.prototype);
	}
	message = 'Number too big.';
}
export class SyntaxError_ParameterCount extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_ParameterCount.prototype);
	}
	message = 'Wrong number of parameters.';
}
export class SyntaxError_EmptyExpression extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_EmptyExpression.prototype);
	}
	message = 'Expression not found.';
}
export class SyntaxError_UnrecognisedToken extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_UnrecognisedToken.prototype);
	}
	message = 'Unrecognised token.';
}
export class SyntaxError_InvalidCharacter extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_InvalidCharacter.prototype);
	}
	message = 'Bad expression.';
}
export class SyntaxError_ExpressionTooComplex extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_ExpressionTooComplex.prototype);
	}
	message = 'Expression too complex.';
}
export class SyntaxError_LabelAlreadyDefined extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_LabelAlreadyDefined.prototype);
	}
	message = 'Symbol already defined.';
}
export class SyntaxError_SymbolScopeOutsideMacro extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_SymbolScopeOutsideMacro.prototype);
	}
	message = 'Symbol scope cannot promote outside current macro.';
}
export class SyntaxError_InvalidSymbolName extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_InvalidSymbolName.prototype);
	}
	message = 'Invalid symbol name; must start with a letter and contain only letters, numbers and underscore.';
}
export class SyntaxError_MismatchedBraces extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_MismatchedBraces.prototype);
	}
	message = 'Mismatched braces.';
}

export class SyntaxError_SymbolNotDefined extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_SymbolNotDefined.prototype);
	}
	message = 'Symbol not defined.';
}

export class SyntaxError_OutOfRange extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_OutOfRange.prototype);
	}
	message = 'Out of range.';
}
export class SyntaxError_TypeMismatch extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_TypeMismatch.prototype);
	}
	message = 'Type mismatch.';
}export class SyntaxError_MissingComma extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_MissingComma.prototype);
	}
	message = 'Missing comma.';
}
export class SyntaxError_CantInclude extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_CantInclude.prototype);
	}
	message = 'Can\'t include file.';
}
export class SyntaxError_SymbolScopeOutsideFor extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_SymbolScopeOutsideFor.prototype);
	}
	message = 'Symbol scope cannot promote outside current FOR loop.';
}
export class SyntaxError_SecondPassProblem extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_SecondPassProblem.prototype);
	}
	message = 'Fatal error: the second assembler pass has generated different code to the first.';
}
export class SyntaxError_NoImplied extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoImplied.prototype);
	}
	message = 'Implied mode not allowed for this instruction.';
}

export class SyntaxError_NoImmediate extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoImmediate.prototype);
	}
	message = 'Immediate mode not allowed for this instruction.';
}

export class SyntaxError_ImmTooLarge extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_ImmTooLarge.prototype);
	}
	message = 'Immediate value too large.';
}
export class SyntaxError_ImmNegative extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_ImmNegative.prototype);
	}
	message = 'Immediate value cannot be negative.';
}
export class SyntaxError_UnexpectedComma extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_UnexpectedComma.prototype);
	}
	message = 'Unexpected comma.';
}
export class SyntaxError_6502Bug extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_6502Bug.prototype);
	}
	message = 'JMP (addr) will not execute as intended due to the 6502 bug (addr = &xxFF).';
}
export class SyntaxError_NoIndirect extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoIndirect.prototype);
	}
	message = 'Indirect mode not allowed for this instruction.';
}
export class SyntaxError_NotZeroPage extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NotZeroPage.prototype);
	}
	message = 'Address is not in zero-page.';
}
export class SyntaxError_BadAddress extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BadAddress.prototype);
	}
	message = 'Out of range address.';
}
export class SyntaxError_BadIndirect extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BadIndirect.prototype);
	}
	message = 'Incorrectly formed indirect instruction.';
}
export class SyntaxError_MismatchedParentheses extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_MismatchedParentheses.prototype);
	}
	message = 'Mismatched parentheses.';
}
export class SyntaxError_BranchOutOfRange extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BranchOutOfRange.prototype);
	}
	message = 'Branch out of range.';
}
export class SyntaxError_NoAbsolute extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoAbsolute.prototype);
	}
	message = 'Absolute addressing mode not allowed for this instruction.';
}
export class SyntaxError_BadAbsolute extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BadAbsolute.prototype);
	}
	message = 'Incorrectly formed absolute instruction.';
}
export class SyntaxError_BadIndexed extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BadIndexed.prototype);
	}
	message = 'Syntax error in indexed instruction.';
}
export class SyntaxError_NoIndexedX extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoIndexedX.prototype);
	}
	message = 'X indexed mode does not exist for this instruction.';
}
export class SyntaxError_NoIndexedY extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoIndexedY.prototype);
	}
	message = 'Y indexed mode does not exist for this instruction.';
}
export class SyntaxError_BackwardsSkip extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BackwardsSkip.prototype);
	}
	message = 'Cannot skip backwards.';
}
export class SyntaxError_BadAlignment extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BadAlignment.prototype);
	}
	message = 'Bad alignment.';
}
export class SyntaxError_MissingValue extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_MissingValue.prototype);
	}
	message = 'Missing value in expression.';
}
export class SyntaxError_AssertionFailed extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_AssertionFailed.prototype);
	}
	message = 'Assertion failed.';
}
export class SyntaxError_TooManyFORs extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_TooManyFORs.prototype);
	}
	message = 'Too many nested FORs or braces.';
}
export class SyntaxError_BadStep extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_BadStep.prototype);
	}
	message = 'Step value cannot be zero.';
}
export class SyntaxError_NextWithoutFor extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NextWithoutFor.prototype);
	}
	message = 'NEXT without FOR.';
}
export class SyntaxError_OnlyOneAnonSave extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_OnlyOneAnonSave.prototype);
	}
	message = 'Can only use SAVE without a filename once per project.';
}
export class SyntaxError_NoAnonSave extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoAnonSave.prototype);
	}
	message = 'Cannot specify SAVE without a filename if no default output filename has been specified.';
}
export class SyntaxError_MissingAssemblyInstruction extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_MissingAssemblyInstruction.prototype);
	}
	message = 'Expected an assembly language instruction.';
}
export class SyntaxError_DuplicateMacroName extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_DuplicateMacroName.prototype);
	}
	message = 'Macro name already defined.';
}
export class SyntaxError_InvalidMacroName extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_InvalidMacroName.prototype);
	}
	message = 'Invalid macro name; must start with a letter and contain only letters, numbers and underscore.';
}
export class SyntaxError_TooManyIFs extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_TooManyIFs.prototype);
	}
	message = 'Too many nested IFs.';
}
export class SyntaxError_ElifWithoutIf extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_ElifWithoutIf.prototype);
	}
	message = 'ELIF without IF.';
}
export class SyntaxError_ElseWithoutIf extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_ElseWithoutIf.prototype);
	}
	message = 'ELSE without IF.';
}
export class SyntaxError_EndifWithoutIf extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_EndifWithoutIf.prototype);
	}
	message = 'ENDIF without IF.';
}
export class SyntaxError_NoNestedMacros extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_NoNestedMacros.prototype);
	}
	message = 'Cannot define one macro inside another.';
}
export class SyntaxError_EndMacroUnexpected extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_EndMacroUnexpected.prototype);
	}
	message = 'Unterminated macro (ENDMACRO not found).';
}
export class SyntaxError_IllegalOperation extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_IllegalOperation.prototype);
	}
	message = 'Operation attempted with invalid or out of range values.';
}
export class SyntaxError_TimeResultTooBig extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_TimeResultTooBig.prototype);
	}
	message = 'TIME$() result too big.';
}
export class SyntaxError_DivisionByZero extends SyntaxError {
	constructor(line: string, column: number) {
		super(line, column);
		Object.setPrototypeOf(this, SyntaxError_DivisionByZero.prototype);
	}
	message = 'Division by zero.';
}


export class AssembleError extends SyntaxError {
	public _line = '';
	public _column = 0;

	constructor() {
		super('', 0);
	}
	public SetString(line: string): void {
		this._line = line;
	}
	public SetColumn(column: number): void {
		this._column = column;
	}
}
export class AssembleError_OutOfMemory extends AssembleError {
	constructor() {
		super();
		Object.setPrototypeOf(this, AssembleError_OutOfMemory.prototype);
	}
	message = 'Out of memory.';
}
export class AssembleError_GuardHit extends AssembleError {
	constructor() {
		super();
		Object.setPrototypeOf(this, AssembleError_GuardHit.prototype);
	}
	message = 'Guard point hit.';
}
export class AssembleError_Overlap extends AssembleError {
	constructor() {
		super();
		Object.setPrototypeOf(this, AssembleError_Overlap.prototype);
	}
	message = 'Trying to assemble over existing code.';
}
export class AssembleError_InconsistentCode extends AssembleError {
	constructor() {
		super();
		Object.setPrototypeOf(this, AssembleError_InconsistentCode.prototype);
	}
	message = 'Assembled object code has changed between 1st and 2nd pass. Has a zero-page symbol been forward-declared?';
}
