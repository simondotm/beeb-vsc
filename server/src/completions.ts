import {
	Command,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	InsertTextFormat,
	TextDocuments,
	SignatureHelp,
	SignatureInformation,
} from 'vscode-languageserver/node';
import { beebasmCommands, beebasmFunctions } from './shareddata';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable } from './beebasm-ts/symboltable';
  
const triggerParameterHints = Command.create(
	'Trigger parameter hints',
	'editor.action.triggerParameterHints'
);

const functionCompletions: CompletionItem[] = beebasmFunctions.map((item) =>
({
	label: item.label,
	kind: CompletionItemKind.Function, 
	insertTextFormat: InsertTextFormat.Snippet,
	insertText: `${item.label}($1)$0`,
	command: triggerParameterHints,
	detail: 'function',
	documentation: item.documentation
}));
const commandCompletions: CompletionItem[] = beebasmCommands.map((item) =>
({
	label: item.label,
	kind: CompletionItemKind.Method, 
	insertTextFormat: InsertTextFormat.Snippet,
	insertText: `${item.label} $0`,
	command: triggerParameterHints,
	detail: 'command',
	documentation: item.documentation
}));
  
export class CompletionProvider
{
	async onCompletion(_textDocumentPosition: TextDocumentPositionParams) {
		// The parameter contains the position of the text document in
		// which code complete got requested. We always provide the same 
		// completion items regardless. Let VS Code filter the results.
		const symbolTemplate: CompletionItem = {
			label: 'symbol',
			kind: CompletionItemKind.Variable,
			insertTextFormat: InsertTextFormat.PlainText,
			insertText: 'symbol',
			command: triggerParameterHints,
			detail: 'symbol',
			documentation: 'Insert a symbol'
		};
		// Collect all symbols and labels from the SymbolTable
		const symbols = SymbolTable.Instance.GetSymbols();
		const symbolCompletionItems: CompletionItem[] = [...symbols.entries()].map((item) =>
		({
			label: item[0],
			kind: item[1].IsLabel() ? CompletionItemKind.Reference : CompletionItemKind.Variable,
			insertTextFormat: InsertTextFormat.PlainText,
			insertText: item[0],
		}));

		return functionCompletions.concat(commandCompletions).concat(symbolCompletionItems);
	}

	async onCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
		return Promise.resolve(item);
	}
}

const signatures: SignatureInformation[] = beebasmFunctions.map((item) =>
({
	label: item.label,
	documentation: item.documentation,
	parameters: item.parameters
}));

const functionAndCommandIdentifiers = new Set(beebasmFunctions.map((item) => item.label).concat(beebasmCommands.map((item) => item.label)));

export class SignatureProvider
{
	private documents;
	constructor(documents: TextDocuments<TextDocument> | null = null) {
		this.documents = documents;
	}

	async onSignatureHelp(_textDocumentPositionParams: TextDocumentPositionParams): Promise<SignatureHelp | null> {
		const lineno = _textDocumentPositionParams.position.line;
		const character = _textDocumentPositionParams.position.character;
		if (this.documents === null) {
			return null;
		}
		const doc = this.documents.get(_textDocumentPositionParams.textDocument.uri);
		if (!doc) {
			return null;
		}
		// Get text from document
		const line = doc.getText().split(/\r?\n/g)[lineno];
		const [functionName, parameterNo] = this.findMatchingFunction(line, character);
		// filter signatures to only those matching the function name
		const matchingSignatures = signatures.filter((item) => item.label === functionName);
		
		return <SignatureHelp> {
			signatures: matchingSignatures,
			activeSignature: 0,
			activeParameter: parameterNo
		};
	}

	// TODO : Can make private when unit testing complete? Don't want to lose tests though
	public findMatchingFunction(line: string, character: number): [string, number] {
		// Parse text for function name
		// Find all words in line then check against functionAndCommand set
		const pattern = /[a-z][\w$]+/ig;
		// Find last word before the character position
		const matches = [...line.matchAll(pattern)];
		let potentialmatch = '';
		let potentialmatchPosition = 0;
		matches.forEach((match) => {
			// word must end before the character position
			if (match.index !== undefined) {
				if (match.index + match[0].length < character) {
					if (functionAndCommandIdentifiers.has(match[0].toUpperCase())) {
						potentialmatch = match[0];
						potentialmatchPosition = match.index;
					}
				}
			}
			// console.log(potentialmatch);
		});

		// Still need to check if within a statement, so search for a colon after the match
		const colonIndex = line.indexOf(':', potentialmatchPosition);
		if (colonIndex !== -1 && colonIndex < character) {
			return ['', 0];
		}

		// Count commas before the character position, excluding those in brackets or quotes
		let commas = 0;
		let bracketDepth = 0;
		let quoteDepth = 0;
		for (let i = potentialmatchPosition + potentialmatch.length + 1; i < character; i++) {
			if (line[i] === '(' && quoteDepth === 0) {
				bracketDepth++;
			}
			if (line[i] === ')' && quoteDepth === 0) {
				bracketDepth--;
			}
			if (line[i] === '"' && bracketDepth === 0) {
				quoteDepth++;
			}
			if (line[i] === '"' && bracketDepth === 0) {
				quoteDepth--;
			}
			if (line[i] === ',' && bracketDepth === 0 && quoteDepth === 0) {
				commas++;
			}
		}

		return [potentialmatch, commas];
	}
}