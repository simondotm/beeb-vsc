import {
	Location, Position, Range,
	RenameParams, PrepareRenameParams,
	WorkspaceEdit, TextEdit,
	DocumentSymbol, SymbolKind,
	DocumentSymbolParams,
	ReferenceParams,
	DefinitionParams
} from 'vscode-languageserver/node';
import { SymbolTable } from './beebasm-ts/symboltable';
import { FileHandler } from './filehandler';
import { URI } from 'vscode-uri';

export class RenameProvider {
	constructor () {}

	onPrepareRename(params: PrepareRenameParams): Range | null {
		const textDocument = FileHandler.Instance.documents.get(params.textDocument.uri);
		const fspath = URI.parse(params.textDocument.uri).fsPath;
		const position = params.position;
		if (textDocument) {
			const currentLine = textDocument.getText().split(/\r?\n/g)[position.line];
			const symbolname = GetTargetedSymbol(currentLine, position);
			if (symbolname === null) {
				return null;
			}
			// lookup symbol in symbol table to confirm it exists
			const [matched, fullSymbolName] = SymbolTable.Instance.GetSymbolByLine(symbolname, fspath, position.line);
			if (matched === undefined) {
				return null;
			}
			// check not a built in symbol
			if (matched.GetLocation().uri === "") {
				return null;
			}
			return matched.GetLocation().range;
		}
		return null;
	}

	onRename(params: RenameParams): WorkspaceEdit | null {
		// Can assume symbol is valid for rename because use prepareRename first
		const textDocument = FileHandler.Instance.documents.get(params.textDocument.uri);
		const fspath = URI.parse(params.textDocument.uri).fsPath;
		const version = textDocument?.version;
		const position = params.position;
		if (!textDocument) {
			return null;
		}
		const currentLine = textDocument.getText().split(/\r?\n/g)[position.line];
		const symbolname = GetTargetedSymbol(currentLine, position);
		if (symbolname === null) {
			return null;
		}
		const [matched, _] = SymbolTable.Instance.GetSymbolByLine(symbolname, fspath, position.line);
		if (matched === undefined) {
			return null;
		}
		const references = SymbolTable.Instance.GetReferences(symbolname);
		if (references === undefined) {
			return null;
		}

		const workspaceEdits: WorkspaceEdit = { documentChanges: [] };
		// make map of textDocument/uri to edits
		const editsByUri = new Map<string, TextEdit[]>();
		// first put targeted symbol in
		editsByUri.set(params.textDocument.uri, [
			{
				range: matched.GetLocation().range,
				newText: params.newName
			}
		]);
		// then put references in
		for (const ref of references) {
			const uri = ref.uri;
			const formattedURI = URI.parse(uri).toString(); // Convert fsPath to stringified URI as would be sent from vscode
			if (!editsByUri.has(formattedURI)) {
				editsByUri.set(formattedURI, []);
			}
			const edits = editsByUri.get(formattedURI);
			edits!.push({
				range: ref.range,
				newText: params.newName
			});
		}
		// transfer edits to workspaceEdits
		for (const [uri, edits] of editsByUri) {
			workspaceEdits.documentChanges?.push({
				textDocument: {
					uri: uri,
					version: null // Add the version property here if known
				},
				edits: edits
			});
		}

		return workspaceEdits;
	}
}

export class SymbolProvider {
	constructor () {}

	// TODO - consider to change symbol to type outerLabel.innerLabel instead of label_@... 
	// Might not be possible, depends on label style of programmer
	onDocumentSymbol(params: DocumentSymbolParams): DocumentSymbol[] | null {
		const textDocument = FileHandler.Instance.documents.get(params.textDocument.uri);
		// TODO - URI from params is not same format as from filesystem (e.g. file:///path vs path)
		const cleanPath = URI.parse(params.textDocument.uri).fsPath;
		if (textDocument) {
			const symbols = SymbolTable.Instance.GetSymbols();
			const symbolList: DocumentSymbol[] = [];
			symbols.forEach((symboldata, symbolname) => {
				if (symboldata.GetLocation().uri === cleanPath) {
					symbolList.push({
						name: symbolname,
						detail: "",
						kind: symboldata.IsLabel() ? SymbolKind.Function : SymbolKind.Variable,
						range: symboldata.GetLocation().range, // Could include any trailing comments for full scope of definition
						selectionRange: symboldata.GetLocation().range
					});}
				}
			);
			return symbolList;
		}
		return null;
	}

	onReferences(params: ReferenceParams): Location[] | null {
		const textDocument = FileHandler.Instance.documents.get(params.textDocument.uri);
		const fspath = URI.parse(params.textDocument.uri).fsPath;
		const location = params.position;
		if (textDocument) {
			const currentLine = textDocument.getText().split(/\r?\n/g)[location.line]; // Would be nice to get just the line using a range argument but not sure what end position would be
			const refs = FindReferences(currentLine, fspath, location);
			const definition = FindDefinition(currentLine, fspath, location);
			if (definition !== null) {
				if (refs === null) {
					return [definition];
				}
				refs.push(definition);
			}
			return refs;
		}
		return null;
	}

	onDefinition(params: DefinitionParams): Location | null {
		const textDocument = FileHandler.Instance.documents.get(params.textDocument.uri);
		const fspath = URI.parse(params.textDocument.uri).fsPath;
		const location = params.position;
		if (textDocument) {
			const currentLine = textDocument.getText().split(/\r?\n/g)[location.line];
			return FindDefinition(currentLine, fspath, location);
		}
		return null;
	}
}

function GetTargetedSymbol(currentLine: string, location: Position): string | null {
	// get symbol selected by searching forwards and backwards from cursor position
	let symbolname = currentLine.charAt(location.character);
	if (symbolname !== '' && !symbolname.match(/[a-zA-Z0-9_%&$]/)) {
		// console.log("invalid symbol: " + symbolname);
		return null;
	}
	// search backwards
	let i = location.character - 1;
	while (i >= 0) {
		const char = currentLine.charAt(i);
		if (!char.match(/[a-zA-Z0-9_%&$]/)) {
			break;
		}
		symbolname = char + symbolname;
		i--;
	}
	// search forwards
	i = location.character + 1;
	while (i < currentLine.length) {
		const char = currentLine.charAt(i);
		if (!char.match(/[a-zA-Z0-9_%&$]/)) {
			break;
		}
		symbolname = symbolname + char;
		i++;
	}
	return symbolname;
}

export function FindDefinition(currentLine: string, uri: string, location: Position): Location | null {
	let result: Location;
	const symbolname = GetTargetedSymbol(currentLine, location);
	if (symbolname === null) {
		return null;
	}

	// lookup symbol in symbol table
	const [matched, _] = SymbolTable.Instance.GetSymbolByLine(symbolname, uri, location.line);
	if (matched) {
		result = matched.GetLocation();
		return result;
	}
	return null;
}

export function FindReferences(currentLine: string, uri: string, location: Position): Location[] | null {
	const symbolname = GetTargetedSymbol(currentLine, location);
	if (symbolname === null) {
		return null;
	}
	// lookup symbol in symbol table
	const [matched, fullSymbolName] = SymbolTable.Instance.GetSymbolByLine(symbolname, uri, location.line);
	if (matched === undefined) {
		return null;
	}

	const refs = SymbolTable.Instance.GetReferences(fullSymbolName);
	if (refs === undefined) {
		return null;
	}
	return refs;
}
