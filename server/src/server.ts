import {
	createConnection,
	Diagnostic,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	ConfigurationItem,
	DocumentLink,
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionProvider, SignatureProvider } from './completions';
import { SymbolTable } from './beebasm-ts/symboltable';
import { GlobalData } from './beebasm-ts/globaldata';
import { ObjectCode } from './beebasm-ts/objectcode';
import { SourceFile } from './beebasm-ts/sourcefile';
import { RenameProvider, SymbolProvider } from './symbolhandler';
import { MacroTable } from './beebasm-ts/macro';
import { FileHandler } from './filehandler';
import { HoverProvider } from './hoverprovider';

const connection = createConnection(ProposedFeatures.all);
const trees: Map<string, any[]> = new Map<string, any[]>();
const links: Map<string, DocumentLink[]> = new Map<string, DocumentLink[]>();
// GlobalData and ObjectCode objects are static and will be set up when called in ParseDocument

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;
	const workspaceFolders = params.workspaceFolders;
	console.log(`[Server(${process.pid})] Started and initialize received`);
	if (workspaceFolders != null) {
		workspaceFolders.forEach((folder) => {console.log(`Folder: ${folder.name} (${folder.uri})`);});
	}

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			signatureHelpProvider: {
				triggerCharacters: ['(', ' '],
				retriggerCharacters : [',']
			},
			documentSymbolProvider: true, // go to symbol
			definitionProvider: true, // go to definition
			referencesProvider: true, // find all references
			hoverProvider: true, // hover information
			renameProvider: {
				prepareProvider: true
			},
			documentLinkProvider: {
				resolveProvider: false
			}

		}
	};
	result.capabilities.workspace = {
		workspaceFolders: {
			supported: true
		}
	};
	return result;
});

connection.onInitialized(() => {
	// Register for all configuration changes.
	connection.client.register(DidChangeConfigurationNotification.type, undefined);
	connection.workspace.onDidChangeWorkspaceFolders(_event => {
		connection.console.log('Workspace folder change event received.');
	});
});


// TODO - base settings on beebasm command line options if any are suitable for this extension
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	// Reset all cached document settings
	documentSettings.clear();

	// Revalidate all open text documents
	// Only calling once as always start from root document and that will pick up others via INCLUDE statements
	const temp = FileHandler.Instance.documents.all().at(0);
	if (temp !== undefined) {
		ParseDocument(temp);
	}
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
FileHandler.Instance.documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
FileHandler.Instance.documents.onDidChangeContent(change => {
	// console.log(`Document changed: ${change.document.uri}`);
	ParseDocument(change.document);
});

// Read settings.json setting for source file name
// TODO - move to FileHandler?
// TODO - cache the workspace root? Seems to only return sometimes
async function getSourceFileName(): Promise<string> {
	let workspaceroot = "";
	const folders = await connection.workspace.getWorkspaceFolders();
	if (folders !== null) {
		if (folders.length > 0) {
			workspaceroot = URI.parse(folders[0].uri).fsPath;
		}
		let filename = "";
		const item: ConfigurationItem = { scopeUri: workspaceroot, section: 'beebvsc' };
		const settings = await connection.workspace.getConfiguration(item);
		filename = settings['sourceFile'];
		// connection.console.log(`Source file name: ${filename}`);
		return filename;
	}
	else {
		connection.console.log(`No workspace folders`);
		return "";
	}
}

// TODO add GetRootDocument to FileHandler which takes a document and returns the root document
// Would allow multi-root workspaces to be supported and parse correct document group
async function ParseDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);
	// map from uri to diagnostics
	const diagnostics = new Map<string, Diagnostic[]>();
	diagnostics.set(URI.parse(textDocument.uri).fsPath, []);

	// Get the source file name
	let sourceFilePath = await getSourceFileName();
	if (sourceFilePath === "") {
		connection.console.log(`No source file name set, using current document`);
		sourceFilePath = URI.parse(textDocument.uri).fsPath; // TODO - note return includes textDocument.uri and that mustn't change
	}
	// Get the document text
	if (sourceFilePath === undefined) {
		return;
	}
	const text = FileHandler.Instance.GetDocumentText(sourceFilePath);

	SymbolTable.Instance.Reset();
	MacroTable.Instance.Reset();
	ObjectCode.Instance.Reset();
	for ( let pass = 0; pass < 2; pass++ ) {
		GlobalData.Instance.SetPass(pass);
		ObjectCode.Instance.InitialisePass();
		GlobalData.Instance.ResetForId();
		trees.clear();
		links.clear();
		const input = new SourceFile(text, null, diagnostics, sourceFilePath, trees, links);
		input.Process();
	}
	// Remove duplicate diagnostics (due to 2-passes)
	// We keep both passes so that we can report errors that only occur in one pass
	const currentDiagnostics = diagnostics.get(URI.parse(textDocument.uri).fsPath)!;
	let thisDiagnostics: Diagnostic[] = [];
	thisDiagnostics = currentDiagnostics.filter((value, index) => {
		const _value = JSON.stringify(value);
		return index === currentDiagnostics.findIndex(obj => {
			return JSON.stringify(obj) === _value;
		});
	});

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: thisDiagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode - nothing monitored currently
	// Could be manual edits to settings.json but that should be picked up by onDidChangeConfiguration
	connection.console.log('We received an file change event');
});

// Setup completions handling
const completionHandler = new CompletionProvider();
connection.onCompletion(completionHandler.onCompletion.bind(completionHandler));
connection.onCompletionResolve(completionHandler.onCompletionResolve.bind(completionHandler));
// Setup signature help handling
const signatureHandler = new SignatureProvider(FileHandler.Instance.documents);
connection.onSignatureHelp(signatureHandler.onSignatureHelp.bind(signatureHandler));

const symbolProvider = new SymbolProvider();
// Symbol definitions (accessed via command palette then starting entry with @)
connection.onDocumentSymbol(symbolProvider.onDocumentSymbol.bind(symbolProvider));
// Symbol references - for find all references
connection.onReferences(symbolProvider.onReferences.bind(symbolProvider));
// For go to definition
connection.onDefinition(symbolProvider.onDefinition.bind(symbolProvider));

const renameProvider = new RenameProvider();
connection.onPrepareRename(renameProvider.onPrepareRename.bind(renameProvider));
connection.onRenameRequest(renameProvider.onRename.bind(renameProvider));

// TODO - add document link provider for INCBIN, PUTBASIC, PUTTEXT, PUTFILE statements? 
// This extension doesn't support the file types but could still link to them and leave it to the user
connection.onDocumentLinks((params) => {
	const doc = URI.parse(params.textDocument.uri).fsPath;
	const docLinks = links.get(doc);
	if (docLinks !== undefined) {
				return docLinks;
	}
	return [];
});

const hoverHandler = new HoverProvider(trees);
connection.onHover(hoverHandler.onHover.bind(hoverHandler));

// Make the text document manager listen on the connection
// for open, change and close text document events
FileHandler.Instance.documents.listen(connection);

// Listen on the connection
connection.listen();

