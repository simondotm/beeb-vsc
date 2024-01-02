import { AST } from '../ast';
import { SourceCode } from './sourcecode';
import { Diagnostic, DocumentLink, URI } from 'vscode-languageserver';

export class SourceFile extends SourceCode {
	
	constructor(contents: string, parent: SourceCode | null, diagnostics: Map<string, Diagnostic[]>, uri: URI, trees: Map<string, AST[]>, links: Map<string, DocumentLink[]>) {
		super(contents, 0, parent, diagnostics, uri, trees, links);
		console.log(`SourceFile constructor called for ${uri}`);
	}

	GetLine(lineNumber: number): string {
		return super.GetLine(lineNumber);
	}
}