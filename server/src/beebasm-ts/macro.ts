import { SourceCode } from './sourcecode';
import { Diagnostic } from 'vscode-languageserver';

export class Macro {
	private _filename: string;
	private _lineNumber: number;
	private _body: string;
	private _name: string;
	private _parameters: string[] = [];

	constructor(filename: string, lineNumber: number) {
		this._filename = filename;
		this._lineNumber = lineNumber;
		this._body = '';
		this._name = '';
	}

	AddLine(line: string): void {
		this._body += line;
	}

	GetBody(): string {
		return this._body;
	}

	GetName(): string {
		return this._name;
	}

	SetName(name: string): void {
		this._name = name;
	}

	GetNumberOfParameters(): number {
		return this._parameters.length;
	}

	GetParameter(index: number): string {
		return this._parameters[index];
	}

	AddParameter(parameter: string): void {
		this._parameters.push(parameter);
	}

	GetLineNumber(): number {
		return this._lineNumber;
	}
}

// export class MacroInstance extends SourceCode {
// 	private _macro: Macro;

// 	constructor(macro: Macro, sourceCode: SourceCode, diagnostics: Diagnostic[]) {
// 		super(macro.GetBody(), macro.GetLineNumber(), sourceCode, diagnostics);
// 		this._macro = macro;
// 		this.CopyForStack(sourceCode);
// 	}

// 	GetMacro(): Macro {
// 		return this._macro;
// 	}
// }

export class MacroTable {
	private _macros: Map<string, Macro> = new Map<string, Macro>();
	private static _instance: MacroTable;

	public static get Instance()
	{
		// Do you need arguments? Make it a regular static method instead.
		return this._instance || (this._instance = new this());
	}

	Add(macro: Macro): void {
		if (macro !== undefined) {
			this._macros.set(macro.GetName(), macro);
		}
	}

	Get(name: string): Macro | undefined {
		return this._macros.get(name);
	}

	Exists(name: string): boolean {
		return this._macros.has(name);
	}

	Reset(): void {
		this._macros.clear();
	}

}