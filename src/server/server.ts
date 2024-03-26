import {
  createConnection,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  ConfigurationItem,
  DocumentLink,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CompletionProvider, SignatureProvider } from './completions'
import { SymbolTable } from './beebasm-ts/symboltable'
import { GlobalData } from './beebasm-ts/globaldata'
import { ObjectCode } from './beebasm-ts/objectcode'
import { SourceFile } from './beebasm-ts/sourcefile'
import { RenameProvider, SymbolProvider } from './symbolhandler'
import { MacroTable } from './beebasm-ts/macro'
import { FileHandler } from './filehandler'
import { HoverProvider } from './hoverprovider'
import { AST } from './ast'

const connection = createConnection(ProposedFeatures.all)
const trees: Map<string, AST[]> = new Map<string, AST[]>()
const links: Map<string, DocumentLink[]> = new Map<string, DocumentLink[]>()
// GlobalData and ObjectCode objects are static and will be set up when called in ParseDocument

connection.onInitialize((params: InitializeParams) => {
  const workspaceFolders = params.workspaceFolders
  console.log(`[Server(${process.pid})] Started and initialize received`)
  if (workspaceFolders != null) {
    workspaceFolders.forEach((folder) => {
      console.log(`Folder: ${folder.name} (${folder.uri})`)
    })
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      signatureHelpProvider: {
        triggerCharacters: ['(', ' '],
        retriggerCharacters: [','],
      },
      documentSymbolProvider: true, // go to symbol
      definitionProvider: true, // go to definition
      referencesProvider: true, // find all references
      hoverProvider: true, // hover information
      renameProvider: {
        prepareProvider: true,
      },
      documentLinkProvider: {
        resolveProvider: false,
      },
    },
  }
  result.capabilities.workspace = {
    workspaceFolders: {
      supported: true,
    },
  }
  return result
})

connection.onInitialized(() => {
  // Register for all configuration changes (when have a configuration that would matter).
  // connection.client.register(DidChangeConfigurationNotification.type, undefined)
  connection.workspace.onDidChangeWorkspaceFolders((_event) => {
    connection.console.log('Workspace folder change event received.')
  })
})

// connection.onDidChangeConfiguration((change) => {
//   // Revalidate all open text documents
//   // Only calling once as always start from root document and that will pick up others via INCLUDE statements
//   const temp = FileHandler.Instance.documents.all().at(0)
//   if (temp !== undefined) {
//     ParseDocument(temp)
//   }
// })

// FileHandler.Instance.documents.onDidClose((e) => {
// })

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
FileHandler.Instance.documents.onDidChangeContent((change) => {
  // Call ParseDocument on root document for the document that has changed
  // or all root documents if don't have the mapping yet
  ParseFromRoot(change.document)
})

async function getStartingFileNames(fileName: string): Promise<string[]> {
  // try to get the file from the filehandler
  const file = FileHandler.Instance.GetTargetFileName(fileName)
  if (file !== undefined) {
    return [file]
  }
  // not known yet, so check the files in settings.json
  const filenames = await getSourcesFromSettings()
  return filenames
}

// Read settings.json setting for source file name
// TODO - move to FileHandler?
// TODO - cache the workspace root? Seems to only return sometimes
async function getSourcesFromSettings(): Promise<string[]> {
  // check the workspace settings
  let workspaceroot = ''
  const folders = await connection.workspace.getWorkspaceFolders()
  if (folders !== null) {
    if (folders.length > 0) {
      workspaceroot = URItoPath(folders[0].uri)
    }
    const item: ConfigurationItem = {
      scopeUri: workspaceroot,
      section: 'beebvsc',
    }
    const settings = await connection.workspace.getConfiguration(item)
    const filename = settings['sourceFile']
    if (typeof filename === 'string') {
      return [filename]
    } else if (filename instanceof Array) {
      return filename
    }
  } else {
    connection.console.log('No workspace folders')
  }
  return []
}

function URItoPath(uri: string): string {
  return URI.parse(uri).fsPath
}

// TODO add GetRootDocument to FileHandler which takes a document and returns the root document
// Would allow multi-root workspaces to be supported and parse correct document group
async function ParseFromRoot(textDocument: TextDocument): Promise<void> {
  const fspath = URItoPath(textDocument.uri)

  // Get the source file name
  let sourceFilePath = await getStartingFileNames(fspath)
  if (sourceFilePath.length === 0) {
    connection.console.log('No source file name set, using current document')
    sourceFilePath = [fspath]
  }

  // Parse each root document (in parallel)
  Promise.all(
    sourceFilePath.map((file) => {
      ParseDocument(file, textDocument.uri)
    }),
  )
}

async function ParseDocument(
  sourceFilePath: string,
  activeFile: string,
): Promise<void> {
  // map from uri to diagnostics
  const diagnostics = new Map<string, Diagnostic[]>()
  diagnostics.set(sourceFilePath, [])
  // Get the document text
  let text: string
  try {
    text = FileHandler.Instance.GetDocumentText(sourceFilePath)
  } catch (error) {
    connection.console.log(`Error reading file ${sourceFilePath}: ${error}`)
    return
  }
  SymbolTable.Instance.Reset()
  MacroTable.Instance.Reset()
  ObjectCode.Instance.Reset()
  for (let pass = 0; pass < 2; pass++) {
    GlobalData.Instance.SetPass(pass)
    ObjectCode.Instance.InitialisePass()
    GlobalData.Instance.ResetForId()
    trees.clear()
    links.clear()
    const input = new SourceFile(
      text,
      null,
      diagnostics,
      sourceFilePath,
      trees,
      links,
    )
    input.Process()
  }
  // Remove duplicate diagnostics (due to 2-passes)
  // We keep both passes so that we can report errors that only occur in one pass
  const currentDiagnostics = diagnostics.get(URItoPath(activeFile))
  if (currentDiagnostics === undefined) {
    // Send empty diagnostics to ensure any previous diagnostics are cleared on re-parse
    connection.sendDiagnostics({
      uri: activeFile,
      diagnostics: [],
    })
    return
  }
  let thisDiagnostics: Diagnostic[] = []
  thisDiagnostics = currentDiagnostics.filter((value, index) => {
    const _value = JSON.stringify(value)
    return (
      index ===
      currentDiagnostics.findIndex((obj) => {
        return JSON.stringify(obj) === _value
      })
    )
  })

  connection.sendDiagnostics({
    uri: activeFile,
    diagnostics: thisDiagnostics,
  })
}

connection.onDidChangeWatchedFiles((_change) => {
  // Settings.json file has changed, hence need to re-parse the source files from the new root(s)
  // start by clearing the text document map
  FileHandler.Instance.ClearIncludeMapping()
  // Trigger a re-parse of the root document(s)
  const filenames = getSourcesFromSettings()
  filenames.then((files): void => {
    files.forEach((file) => {
      ParseDocument(file, '')
    })
  })
  connection.console.log('Settings.json update event received.')
})

// Setup completions handling
const completionHandler = new CompletionProvider()
connection.onCompletion(completionHandler.onCompletion.bind(completionHandler))
connection.onCompletionResolve(
  completionHandler.onCompletionResolve.bind(completionHandler),
)
// Setup signature help handling
const signatureHandler = new SignatureProvider(FileHandler.Instance.documents)
connection.onSignatureHelp(
  signatureHandler.onSignatureHelp.bind(signatureHandler),
)

const symbolProvider = new SymbolProvider()
// Symbol definitions (accessed via command palette then starting entry with @)
connection.onDocumentSymbol(
  symbolProvider.onDocumentSymbol.bind(symbolProvider),
)
// Symbol references - for find all references
connection.onReferences(symbolProvider.onReferences.bind(symbolProvider))
// For go to definition
connection.onDefinition(symbolProvider.onDefinition.bind(symbolProvider))

const renameProvider = new RenameProvider()
connection.onPrepareRename(renameProvider.onPrepareRename.bind(renameProvider))
connection.onRenameRequest(renameProvider.onRename.bind(renameProvider))

// TODO - add document link provider for INCBIN, PUTBASIC, PUTTEXT, PUTFILE statements?
// This extension doesn't support the file types but could still link to them and leave it to the user
connection.onDocumentLinks((params) => {
  const doc = URItoPath(params.textDocument.uri)
  const docLinks = links.get(doc)
  if (docLinks !== undefined) {
    return docLinks
  }
  return []
})

const hoverHandler = new HoverProvider(trees)
connection.onHover(hoverHandler.onHover.bind(hoverHandler))

// Make the text document manager listen on the connection
// for open, change and close text document events
FileHandler.Instance.documents.listen(connection)

// Listen on the connection
connection.listen()
