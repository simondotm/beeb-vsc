import {
  createConnection,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  ConfigurationItem,
  DocumentLink,
  Files,
  RequestType,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CompletionProvider, SignatureProvider } from './completions'
import { SymbolTable } from './beebasm-ts/symboltable'
import { GlobalData } from './beebasm-ts/globaldata'
import { ObjectCode } from './beebasm-ts/objectcode'
import { SourceMapFile } from '../types/shared/debugsource'
import { SourceFile } from './beebasm-ts/sourcefile'
import { RenameProvider, SymbolProvider } from './symbolhandler'
import { MacroTable } from './beebasm-ts/macro'
import { FileHandler, URItoVSCodeURI } from './filehandler'
import { HoverProvider } from './hoverprovider'
import { AST } from './ast'
import { SemanticTokensProvider } from './semantictokenprovider'
import * as path from 'path'
import { writeFileSync } from 'fs'

const connection = createConnection(ProposedFeatures.all)
const trees: Map<string, AST[]> = new Map<string, AST[]>()
const links: Map<string, DocumentLink[]> = new Map<string, DocumentLink[]>()
// GlobalData and ObjectCode objects are static and will be set up when called in ParseDocument

// Define the custom request type for requesting a source map
const SourceMapRequestType = new RequestType<{ text: string }, string, void>(
  'custom/requestSourceMap',
)

connection.onInitialize((params: InitializeParams) => {
  const workspaceFolders = params.workspaceFolders
  console.log(`[Server(${process.pid})] Started and initialize received`)
  if (workspaceFolders != null) {
    workspaceFolders.forEach((folder) => {
      console.log(`Folder: ${folder.name} (${folder.uri})`)
    })
    FileHandler.Instance.SetWorkspaceRoot(workspaceFolders[0].uri)
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
async function getSourcesFromSettings(): Promise<string[]> {
  // check the workspace settings
  const folders = await connection.workspace.getWorkspaceFolders()
  if (folders !== null) {
    if (folders.length > 0) {
      const workspaceroot = URItoVSCodeURI(folders[0].uri)
      const rootpath = Files.uriToFilePath(workspaceroot) ?? ''
      const item: ConfigurationItem = {
        scopeUri: workspaceroot,
        section: 'beebvsc',
      }
      const settings = await connection.workspace.getConfiguration(item)
      let filename = settings['sourceFile']
      if (typeof filename === 'string') {
        // prefix the workspace root if this is not an absolute path
        if (!path.isAbsolute(filename)) {
          filename = URItoVSCodeURI(path.join(rootpath, filename))
        } else {
          filename = URItoVSCodeURI(filename)
        }
        return [filename]
      } else if (filename instanceof Array) {
        // prefix the workspace root if this is not an absolute path
        filename = filename.map((file: string) => {
          if (!path.isAbsolute(file)) {
            return URItoVSCodeURI(path.join(rootpath, file))
          }
          return URItoVSCodeURI(file)
        })
        return filename
      }
    }
  } else {
    console.log('No workspace folders')
  }
  return []
}

async function ParseFromRoot(textDocument: TextDocument): Promise<void> {
  const uri = textDocument.uri

  // Get the source file name
  let sourceFilePath = await getStartingFileNames(uri)
  if (sourceFilePath.length === 0) {
    console.log('No source file name set, language server disabled.')
    sourceFilePath = []
  }

  // Check if the document is in the sourceFilePath list
  if (sourceFilePath.includes(uri)) {
    await ParseDocument(uri, uri)
    return
  }

  // Parse each root in turn, until find the one that contains the document
  for (const file of sourceFilePath) {
    await ParseDocument(file, textDocument.uri)
    // check if the document is in this root
    const root = FileHandler.Instance.GetTargetFileName(uri)
    if (root === undefined) {
      console.log(`No root found yet for ${uri}`)
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
      null,
    )
    input.Process()
  }
  // Remove duplicate diagnostics (due to 2-passes)
  // We keep both passes so that we can report errors that only occur in one pass
  const currentDiagnostics = diagnostics.get(activeFile) ?? ([] as Diagnostic[])
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

// Handle the source map request
connection.onRequest(SourceMapRequestType, async (params) => {
  console.log(`Received source map request for file: ${params.text}`)
  const result = await SaveSourceMap(params.text)
  const response = `Source map saved: ${result}`
  return response
})

async function SaveSourceMap(activeFile: string): Promise<string | null> {
  const uri = URItoVSCodeURI(activeFile)
  const root = FileHandler.Instance.GetTargetFileName(uri)
  if (root === undefined) {
    console.log(`No root found for ${uri}`)
    return null
  }
  const currentDir = URItoVSCodeURI(process.cwd())
  const relative = path.relative(currentDir, root)
  const mapFile = relative + '.map'

  const sourceMap = ObjectCode.Instance.GetSourceMap()

  const output: SourceMapFile = {
    sources: {},
    addresses: {},
  }

  sourceMap.forEach((value, index) => {
    if (value !== null) {
      output.addresses[index] = value
    }
  })
  output.sources = FileHandler.Instance.GetURIRefs()

  const sourceMapString = JSON.stringify(output, null, 2)

  try {
    writeFileSync(mapFile, sourceMapString)
  } catch (error) {
    console.log(`Error writing source map file ${mapFile}: ${error}`)
    return null
  }
  return mapFile
}

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

// TODO - add document link provider for INCBIN, PUTFILE statements?
// Those may not have file handlers but could still link to them and leave it to the user
connection.onDocumentLinks((params) => {
  const doc = params.textDocument.uri
  const docLinks = links.get(doc)
  if (docLinks !== undefined) {
    return docLinks
  }
  return []
})

const hoverHandler = new HoverProvider(trees)
connection.onHover(hoverHandler.onHover.bind(hoverHandler))

const semanticTokensProvider = new SemanticTokensProvider(trees)
connection.languages.semanticTokens.on(
  semanticTokensProvider.on.bind(semanticTokensProvider),
)

// Make the text document manager listen on the connection
// for open, change and close text document events
FileHandler.Instance.documents.listen(connection)

// Listen on the connection
connection.listen()
