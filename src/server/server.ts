import {
  createConnection,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  ConfigurationItem,
  DocumentLink,
  SemanticTokensParams,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CompletionProvider, SignatureProvider } from './completions'
import { SymbolTable } from './beebasm-ts/symboltable'
import { GlobalData } from './beebasm-ts/globaldata'
import { ObjectCode } from './beebasm-ts/objectcode'
import { SourceFile } from './beebasm-ts/sourcefile'
import { RenameProvider, SymbolProvider } from './symbolhandler'
import { MacroTable } from './beebasm-ts/macro'
import { FileHandler, URItoPath } from './filehandler'
import { HoverProvider } from './hoverprovider'
import { AST, GetSemanticTokens } from './ast'

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
      semanticTokensProvider: {
        legend: {
          tokenTypes: ['macro'],
          tokenModifiers: [],
        },
        full: true,
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
    console.log('Workspace folder change event received.')
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
    console.log('No workspace folders')
  }
  return []
}

async function ParseFromRoot(textDocument: TextDocument): Promise<void> {
  const fspath = URItoPath(textDocument.uri)

  // Get the source file name
  let sourceFilePath = await getStartingFileNames(fspath)
  if (sourceFilePath.length === 0) {
    console.log('No source file name set, language server disabled.')
    sourceFilePath = []
  }

  // Parse each root in turn, until find the one that contains the document
  for (const file of sourceFilePath) {
    await ParseDocument(file, textDocument.uri)
    // check if the document is in this root
    const root = FileHandler.Instance.GetTargetFileName(fspath)
    if (root === undefined) {
      console.log(`No root found yet for ${fspath}`)
    }
    if (root === file) {
      break
    }
  }
}

async function ParseDocument(
  sourceFilePath: string,
  activeFile: string,
): Promise<void> {
  console.log(`Parsing ${activeFile} from root ${sourceFilePath}`)
  // map from uri to diagnostics
  const diagnostics = new Map<string, Diagnostic[]>()
  diagnostics.set(sourceFilePath, [])
  // Get the document text
  let text: string
  try {
    text = FileHandler.Instance.GetDocumentText(sourceFilePath)
  } catch (error) {
    console.log(`Error reading file ${sourceFilePath}: ${error}`)
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
  const currentDiagnostics =
    diagnostics.get(URItoPath(activeFile)) ?? ([] as Diagnostic[])
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
  console.log(`Parsing ${activeFile} complete`)
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
  console.log('Settings.json update event received.')
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

connection.onRequest(
  'textDocument/semanticTokens/full',
  (params: SemanticTokensParams) => {
    const doc = URItoPath(params.textDocument.uri)
    const asts = trees.get(doc)
    if (asts === undefined) {
      return { data: [] }
    }
    let lastLine: number = 0
    const tokens: number[] = []
    // loop through line numbers
    for (let i = 0; i < asts.length; i++) {
      const ast = asts[i]
      const lineTokens = GetSemanticTokens(ast, i)
      // calculate delta for line and start character
      if (lineTokens.length > 0) {
        const currentLine = lineTokens[0]
        // did we have a previous line?
        const lineDelta = i - lastLine
        lineTokens[0] = lineDelta
        for (let j = lineTokens.length / 5 - 1; j >= 0; j--) {
          // do we have multiple tokens on this line?
          if (j > 0) {
            lineTokens[5 * j] = 0
            lineTokens[5 * j + 1] -= lineTokens[5 * (j - 1) + 1]
          }
        }
        tokens.push(...lineTokens)
        // set last tokens to last 5 tokens of line tokens
        lastLine = currentLine
      }
    }

    return {
      data: tokens,
    }
  },
)

// Make the text document manager listen on the connection
// for open, change and close text document events
FileHandler.Instance.documents.listen(connection)

// Listen on the connection
connection.listen()
