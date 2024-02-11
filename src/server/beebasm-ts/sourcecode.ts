/*************************************************************************************************/
/**
	Derived from sourcecode.cpp/h

	Represents a piece of source code, whether from a file, or a macro definition.


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

import { Macro, MacroTable } from './macro';
import { LineParser } from './lineparser';
import { SymbolTable } from './symboltable';
import { GlobalData } from './globaldata';
import * as AsmException from './asmexception';
import { Diagnostic, DiagnosticSeverity, DocumentLink, Location } from 'vscode-languageserver';
import { integer } from 'vscode-languageserver';
import { AST } from '../ast';
import { URI } from 'vscode-uri';
import path = require('path');

const MAX_FOR_LEVELS = 256;
const MAX_IF_LEVELS = 256;

type For = {
	varName: string;
	current: number;
	end: number;
	step: number;
	filePtr: number;
	id: number;
	count: number;
	line: string;
	column: number;
	lineNumber: number;
	firstPass: boolean;
};
type If = {
	condition: boolean;
	hadElse: boolean;
	passed: boolean;
	isMacroDefinition: boolean;
	line: string;
	column: number;
	lineNumber: number;
};

//Represents a piece of source code, whether from a file, or a macro definition.

export class SourceCode {
    private _forStackPtr: number;
    private _initialForStackPtr: number;
    private _ifStackPtr: number;
    private _initialIfStackPtr: number;
    private _currentMacro: Macro | null;
    private _contents: string;
    private _lineNumber: number;
    private _parent: SourceCode | null;
    private _lineStartPointer: number;
    private _lines: string[];
    private _forStack: For[] = [];
    private _ifStack: If[] = [];
    private _symbolTable: SymbolTable;
    private _diagnostics: Map<string, Diagnostic[]>;
    private _uri: string;
    private _trees: Map<string, AST[]>;
    private _documentLinks: Map<string, DocumentLink[]>;

    constructor(contents: string, lineNumber: number, parent: SourceCode | null, diagnostics: Map<string, Diagnostic[]>, uri: string, trees: Map<string, AST[]>, doclinks: Map<string, DocumentLink[]>) {
        this._forStackPtr = 0;
        this._initialForStackPtr = 0;
        this._ifStackPtr = 0;
        this._initialIfStackPtr = 0;
        this._currentMacro = null;
        this._contents = contents;
        this._lineNumber = lineNumber;
        this._parent = parent;
        this._lineStartPointer = 0;
        this._lines = contents.split('\n');
        this._diagnostics = diagnostics;
        if (this._diagnostics.get(uri) === undefined) {
            this._diagnostics.set(uri, []);
        }
        this._trees = trees;
        if (this._trees.get(uri) === undefined) {
            this._trees.set(uri, []);
        }
        this._documentLinks = doclinks;
        if (this._documentLinks.get(uri) === undefined) {
            this._documentLinks.set(uri, []);
        }
        this._symbolTable = SymbolTable.Instance; // Added for debugging
        this._uri = uri;
    }

    Process() {
        // Remember the FOR and IF stack initial pointer values
        this._initialForStackPtr = this._forStackPtr;
        this._initialIfStackPtr = this._ifStackPtr;

        // Iterate through the file line-by-line
        let lineFromFile: string;
        const trees: AST[] = [];

        //  while (this.GetLine(lineFromFile)) {
        while (this._lineNumber < this._lines.length) { // get line lsp approach?
            lineFromFile = this.GetLine(this._lineNumber);
            // Convert tabs to spaces
            // StringUtils::ExpandTabsToSpaces( lineFromFile, 8 );
            const lineParsed = this._lineNumber;
            try {
                const thisLine = new LineParser(this, lineFromFile, this._lineNumber);
                thisLine.Process();
                // Should only store tree on first loop if in FOR loop
                if (this._forStackPtr > 0) {
                    if (this.InFirstLoop()) {
                        trees[lineParsed] = thisLine.GetTree(); // Use saved line number as NEXT statement changes it
                    }
                }
                else {
                    // Make sure tree hasn't been set already (e.g. one-line FOR NEXT loop)
                    if (trees[this._lineNumber] === undefined) {
                        trees[this._lineNumber] = thisLine.GetTree();
                    }
                }
            }
            catch (e) {
                if (e instanceof AsmException.SyntaxError) {
                    const diagnostic: Diagnostic = {
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: this._lineNumber, character: 0 },//textDocument.positionAt(m.index),
                            end: { line: this._lineNumber, character: lineFromFile.length } //textDocument.positionAt(m.index + m[0].length)
                        },
                        message: e.message,
                        source: 'vscode-beebasm'
                    };
					this._diagnostics.get(this._uri)!.push(diagnostic);
                }
                else if (e instanceof AsmException.AssembleError) {
                    const diagnostic: Diagnostic = {
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: this._lineNumber, character: 0 },
                            end: { line: this._lineNumber, character: lineFromFile.length }
                        },
                        message: e.message,
                        source: 'vscode-beebasm'
                    };
					this._diagnostics.get(this._uri)!.push(diagnostic);
                }
            }

            this._lineNumber++;
            this._lineStartPointer = this.GetLineStartPointer();
        }
		
        this._trees.set(this._uri, trees);
        //Validation routines
        // // Check that we have no FOR / braces mismatch
        // 	if ( m_forStackPtr != m_initialForStackPtr )
        // 	{
        // 		For& mismatchedFor = m_forStack[ m_forStackPtr - 1 ];
        // 		if ( mismatchedFor.m_step == 0.0 )
        // 		{
        // 			AsmException_SyntaxError_MismatchedBraces e( mismatchedFor.m_line, mismatchedFor.m_column );
        // 			e.SetFilename( m_filename );
        // 			e.SetLineNumber( mismatchedFor.m_lineNumber );
        // 			throw e;
        // 		}
        // 		else
        // 		{
        // 			AsmException_SyntaxError_ForWithoutNext e( mismatchedFor.m_line, mismatchedFor.m_column );
        // 			e.SetFilename( m_filename );
        // 			e.SetLineNumber( mismatchedFor.m_lineNumber );
        // 			throw e;
        // 		}
        // 	}
        // 	// Check that we have no IF / MACRO mismatch
        // 	if ( m_ifStackPtr != m_initialIfStackPtr )
        // 	{
        // 		If& mismatchedIf = m_ifStack[ m_ifStackPtr - 1 ];
        // 		if ( mismatchedIf.m_isMacroDefinition )
        // 		{
        // 			AsmException_SyntaxError_NoEndMacro e( mismatchedIf.m_line, mismatchedIf.m_column );
        // 			e.SetFilename( m_filename );
        // 			e.SetLineNumber( mismatchedIf.m_lineNumber );
        // 			throw e;
        // 		}
        // 		else
        // 		{
        // 			AsmException_SyntaxError_IfWithoutEndif e( mismatchedIf.m_line, mismatchedIf.m_column );
        // 			e.SetFilename( m_filename );
        // 			e.SetLineNumber( mismatchedIf.m_lineNumber );
        // 			throw e;
        // 		}
        // 	}
        // }		
		
        //TODO - Check that we have no FOR / braces mismatch
        //TODO - Check that we have no IF / MACRO mismatch
        // NB - don't throw, just create a diagnostic
    }

    GetDiagnostics(): Map<string, Diagnostic[]> {
        return this._diagnostics;
    }

    GetTrees(): Map<string, AST[]> {
        return this._trees;
    }

    GetLine(lineno: integer): string {
        const line = this._lines[lineno].substring(this._lineStartPointer);
        this.SetLinePointer(0);
        return line;
    }

    AddDocumentLink(link: DocumentLink): void {
		this._documentLinks.get(this._uri)!.push(link);
    }

    GetDocumentLinks(): Map<string, DocumentLink[]> {
        return this._documentLinks;
    }

    GetCurrentMacro(): Macro | null {
        return this._currentMacro;
    }

    GetSymbolNameSuffix(level: integer = -1): string {
        if (level == -1) {
            level = this._forStackPtr;
        }

        let suffix = '';

        for (let i = 0; i < level; i++) {
            // suffix += `@${this._forStack[i].id}_${this._forStack[i].count}`;
            suffix += `@${this._forStack[i].id}_0`; // not finding inner for loop definition without this
        }

        return suffix;
    }

    GetForCount(): integer {
        if (this._forStackPtr === 0) {
            return 0;
        }
        else {
            return this._forStack[this._forStackPtr - 1].count;
        }
    }

    GetURI(): string {
        let uri = this._uri;
        if (process.platform === 'win32') {
            uri = URI.parse('file:///' + path.resolve(this._uri)).toString();
        }
        return uri;
    }

    ShouldOutputAsm(): boolean {
        return false; // For outputing to console in beebasm, maybe useful for creating debug map file?
    }

    IsIfConditionTrue(): boolean {
        for (let i = 0; i < this._ifStackPtr; i++) {
            if (!this._ifStack[i].condition) {
                return false;
            }
        }

        return true;
    }

    // [hasValue, value] = this._sourceCode.GetSymbolValue(symbolName);
    GetSymbolValue(symbolName: string, location: Location | null = null): [boolean, number | string] {
        for (let forLevel = this.GetForLevel(); forLevel >= 0; forLevel--) {
            const fullSymbolName = symbolName + this.GetSymbolNameSuffix(forLevel);

            if (SymbolTable.Instance.IsSymbolDefined(fullSymbolName)) {
                // store symbol reference (fullSymbolName and location) in symbol table
                if (location !== null && GlobalData.Instance.IsSecondPass()) {
                    SymbolTable.Instance.AddReference(fullSymbolName, location);
                }
                return [true, SymbolTable.Instance.GetSymbol(fullSymbolName)];
            }
        }
		
        return [false, 0];
    }

    GetForLevel(): integer {
        return this._forStackPtr;
    }

    CopyForStack(copyFrom: SourceCode) {
        this._forStackPtr = copyFrom._forStackPtr;

        for (let i = 0; i < this._forStackPtr; i++) {
            this._forStack[i] = copyFrom._forStack[i];
        }
    }

    GetInitialForStackPtr(): integer {
        return this._initialForStackPtr;
    }

    IsRealForLevel(level: integer): boolean {
        return this._forStack[level - 1].step != 0;
    }

    Execute(member: string, line: string, column: integer){
        if ( member === 'AddIfLevel' || member === 'StartElIf' || member === 'StartElse' || member === 'RemoveIfLevel' || member === 'StartMacro' || member === 'EndMacro' ) {
            this[member](line, column);
        }
    }

    SetCurrentIfCondition(b: boolean) {
        // 	assert( m_ifStackPtr > 0 );
        this._ifStack[this._ifStackPtr - 1].condition = b;
        if (b) {
            this._ifStack[this._ifStackPtr - 1].passed = true;
        }
    }

    AddIfLevel(line: string, column: number): void {
        if ( this._ifStackPtr == MAX_IF_LEVELS ) {
            throw new AsmException.SyntaxError_TooManyIFs(line, column);
        }
        this._ifStack[this._ifStackPtr] = {
            condition: true,
            passed: false,
            hadElse: false,
            isMacroDefinition: false,
            line: line,
            column: column,
            lineNumber: this._lineNumber
        };
        this._ifStackPtr++;
    }
	
    StartElIf(line: string, column: number): void {
        if (this._ifStack[this._ifStackPtr - 1].hadElse) {
            throw new AsmException.SyntaxError_ElifWithoutIf(line, column);
        }
        this._ifStack[this._ifStackPtr - 1].condition = !this._ifStack[this._ifStackPtr - 1].passed;
    }
	
    StartElse(line: string, column: number): void {
        if (this._ifStack[this._ifStackPtr - 1].hadElse) {
            throw new AsmException.SyntaxError_ElseWithoutIf(line, column);
        }
        this._ifStack[this._ifStackPtr - 1].hadElse = true;
        this._ifStack[this._ifStackPtr - 1].condition = !this._ifStack[this._ifStackPtr - 1].passed;
    }
	
    RemoveIfLevel(line: string, column: number): void {
        if (this._ifStackPtr == 0) {
            throw new AsmException.SyntaxError_EndifWithoutIf(line, column);
        }
        this._ifStackPtr--;
    }
	
    StartMacro(line: string, column: number): void {
        if ( GlobalData.Instance.IsFirstPass() ) {
            if ( this._currentMacro === null ) {
                this._currentMacro = new Macro( this._uri, this._lineNumber );
            }
            else {
                throw new AsmException.SyntaxError_NoNestedMacros(line, column);
            }
        }
        this.AddIfLevel(line, column);
        this.SetCurrentIfAsMacroDefinition();
    }
	
    EndMacro(line: string, column: number): void {
        if ( GlobalData.Instance.IsFirstPass() && this._currentMacro === null ) {
            throw new AsmException.SyntaxError_EndMacroUnexpected(line, column - 8);
        }
        this.RemoveIfLevel(line, column);
        if ( GlobalData.Instance.IsFirstPass() ) {
            MacroTable.Instance.Add(this._currentMacro!);
            this._currentMacro = null;
        }
    }
	
    SetCurrentIfAsMacroDefinition(): void {
        // 	assert( m_ifStackPtr > 0 );
        this._ifStack[this._ifStackPtr - 1].isMacroDefinition = true;
    }

    OpenBrace(line: string, column: number): void {
        if (this._forStackPtr == MAX_FOR_LEVELS) {
            throw new Error('Too many FORs'); //TODO - integrate with error handling/reporting
        }
        // Fill in FOR block
        this._forStack[this._forStackPtr] = {
            varName: '',
            current: 1,
            end: 0,
            step: 0,
            filePtr: 0,
            id: GlobalData.Instance.GetNextForId(),
            count: 0,
            line: line,
            column: column,
            lineNumber: this._lineNumber,
            firstPass: true
        };
        SymbolTable.Instance.PushBrace(this._uri, this._lineNumber, this._forStack[this._forStackPtr].id);
        this._forStackPtr++;
    }

    CloseBrace(line: string, column: number):void {
        if (this._forStackPtr == this._initialForStackPtr) {
            throw new AsmException.SyntaxError_MismatchedBraces(line, column);
        }
        const thisFor = this._forStack[this._forStackPtr - 1];
        // step of non-0.0 here means that this a real 'for', so throw an error
        if (thisFor.step != 0) {
            throw new AsmException.SyntaxError_MismatchedBraces(line, column);
        }
        SymbolTable.Instance.PopScope(this._lineNumber, thisFor.id);
        this._forStackPtr--;
    }

    AddFor(varName: string, start: number, end: number, step: number, filePtr: number, line: string, column: number, lineno: number): void {
        if (this._forStackPtr == MAX_FOR_LEVELS) {
            throw new AsmException.SyntaxError_TooManyFORs(line, column);
        }

        // Add symbol to table
        const loc = {uri: this._uri, range: {start: {line: lineno, character: column}, end: {line: lineno, character: column + varName.length}}};

        // Fill in FOR block
        this._forStack[this._forStackPtr] = {
            varName: varName,
            current: start,
            end: end,
            step: step,
            filePtr: filePtr,
            id: GlobalData.Instance.GetNextForId(),
            count: 0,
            line: line,
            column: column,
            lineNumber: this._lineNumber,
            firstPass: true
        };
        this._forStackPtr++;
        const symbolname = varName + this.GetSymbolNameSuffix();
        this._forStack[this._forStackPtr-1].varName = symbolname; // Update for stack to include suffix
        SymbolTable.Instance.AddSymbol(symbolname, start, loc);
        SymbolTable.Instance.PushFor(symbolname, start, this._uri, this._lineNumber, this._forStack[this._forStackPtr-1].id);
    }

    UpdateFor(line: string, column: number):void {
        if (this._forStackPtr === 0) {
            throw new AsmException.SyntaxError_NextWithoutFor(line, column);
        }
        const thisFor = this._forStack[this._forStackPtr - 1];
        // step of 0.0 here means that the 'for' is in fact an open brace, so throw an error
        if (thisFor.step === 0) {
            throw new AsmException.SyntaxError_NextWithoutFor(line, column);
        }

        thisFor.current += thisFor.step;
        if ((thisFor.step > 0 && thisFor.current > thisFor.end) ||
			(thisFor.step < 0 && thisFor.current < thisFor.end)) {
            // we have reached the end of the FOR
            if ( GlobalData.Instance.IsFirstPass() ) { // Deviation from c++ original so can find definitions
                SymbolTable.Instance.RemoveSymbol(thisFor.varName);
            }
            SymbolTable.Instance.PopScope(this._lineNumber, thisFor.id);
            this._forStackPtr--;
        }
        else {
            // reloop
            SymbolTable.Instance.ChangeSymbol(thisFor.varName, thisFor.current);
            this.SetLinePointer( thisFor.filePtr );
            SymbolTable.Instance.PopScope();
            SymbolTable.Instance.PushFor(thisFor.varName, thisFor.current, this._uri);
            thisFor.count++;
            // If parsing NEXT statement for a second time then no longer in first loop
            if (thisFor.count > 1 || (thisFor.count === 1 && thisFor.lineNumber !== this._lineNumber)) {
                thisFor.firstPass = false;
            }
            this._lineNumber = thisFor.lineNumber - 1;
        }
    }

    InFirstLoop(): boolean {
        // check each level of FOR loop 
        for (let i = 0; i < this._forStackPtr; i++) {
            if (!this._forStack[i].firstPass) {
                return false;
            }
        }
        return true;
    }

    GetLineStartPointer(): number {
        return this._lineStartPointer;
    }

    SetLinePointer(filePtr: number): void {
        // Represents posision in line, not the whole file (like c++ original)
        this._lineStartPointer = filePtr;
    }
}

// Moved here from macro.ts due to circular import issues
export class MacroInstance extends SourceCode {
    private _macro: Macro;

    constructor(macro: Macro, sourceCode: SourceCode, diagnostics: Map<string, Diagnostic[]>, uri: string, trees: Map<string, AST[]>, links: Map<string, DocumentLink[]>) {
        super(macro.GetBody(), macro.GetLineNumber(), sourceCode, diagnostics, uri, trees, links);
        this._macro = macro;
        this.CopyForStack(sourceCode);
    }

    GetMacro(): Macro {
        return this._macro;
    }
}