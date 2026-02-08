import {
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  ConfigurationItem,
  Files,
  RequestType,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CompletionProvider, SignatureProvider } from './completions'
import { SourceMapFile } from '../types/shared/debugsource'
import { SourceFile } from './beebasm-ts/sourcefile'
import { RenameProvider, SymbolProvider } from './symbolhandler'
import { FileHandler, URItoVSCodeURI } from './filehandler'
import { HoverProvider } from './hoverprovider'
import { SemanticTokensProvider } from './semantictokenprovider'
import { InlayHintsProvider } from './inlayhintsprovider'
import { DocumentContext } from './documentContext'
import * as path from 'path'
import { writeFileSync } from 'fs'
import { createDebouncer } from './debounce'
import { parse } from 'jsonc-parser'

const connection = createConnection(ProposedFeatures.all)

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
      inlayHintProvider: true,
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

const inlayHintsProvider = new InlayHintsProvider()
connection.languages.inlayHint.on(
  inlayHintsProvider.on.bind(inlayHintsProvider),
)

// Create a debounced version of the ParseFromRoot function
// With a delay of 250ms which seems a nice balance
const debouncedParse = createDebouncer(ParseFromRoot, 250)

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
FileHandler.Instance.documents.onDidChangeContent((change) => {
  // Call ParseDocument on root document for the document that has changed
  // or all root documents if don't have the mapping yet
  // Using the wrapped function to allow debouncing
  debouncedParse(change.document)
})

async function getStartingFileNames(fileName: string): Promise<string[]> {
  // try to get the file from the filehandler
  const file = FileHandler.Instance.GetTargetFileName(fileName)
  if (file !== undefined) {
    return [file]
  }
  // not known yet, so check the files in settings.json
  const filenames = await getInfoFromSettings()
  return filenames
}

// Read settings.json setting for source file name and other settings
// TODO - move to FileHandler?
async function getInfoFromSettings(): Promise<string[]> {
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
      const inlayHints = settings['enableInlayHints']
      if (inlayHints !== undefined) {
        inlayHintsProvider.enabled = typeof inlayHints === 'string' ? parse(inlayHints) : inlayHints
      }
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

async function ParseFromRoot(
  textDocument: TextDocument,
  signal: AbortSignal,
): Promise<void> {
  // Check if the operation was cancelled before we even start
  if (signal.aborted) {
    return
  }
  const uri = textDocument.uri

  // Get the source file name
  let sourceFilePath = await getStartingFileNames(uri)
  if (sourceFilePath.length === 0) {
    console.log('No source file name set, language server disabled.')
    sourceFilePath = []
  }

  // Check if the document is in the sourceFilePath list
  if (sourceFilePath.includes(uri)) {
    await ParseDocument(uri, uri, FileHandler.Instance.getContext(uri))
    return
  }

  // Parse each root in turn, until find the one that contains the document
  for (const file of sourceFilePath) {
    const context = FileHandler.Instance.getContext(file)
    await ParseDocument(file, textDocument.uri, context)
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
  context: DocumentContext,
): Promise<void> {
  console.log(`Parsing ${activeFile} from root ${sourceFilePath}`)
  const startTime = Date.now()
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
  context.reset()
  for (let pass = 0; pass < 2; pass++) {
    context.globalData.SetPass(pass)
    context.objectCode.InitialisePass()
    context.globalData.ResetForId()
    context.trees.clear()
    context.links.clear()
    const input = new SourceFile(
      text,
      null,
      diagnostics,
      sourceFilePath,
      context.trees,
      context.links,
      null,
      context,
    )
    input.Process()
  }
  // Check for unused symbols
  const unusedDiagnostics = checkUnusedSymbols(context, activeFile)
  const activeDiagnostics = diagnostics.get(activeFile) ?? []
  activeDiagnostics.push(...unusedDiagnostics)
  diagnostics.set(activeFile, activeDiagnostics)
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
  console.log(`Parsing ${activeFile} complete in ${Date.now() - startTime} ms`)
}

connection.onDidChangeWatchedFiles((_change) => {
  // Settings.json file has changed, hence need to re-parse the source files from the new root(s)
  // start by clearing the text document map
  FileHandler.Instance.ClearIncludeMapping()
  // Trigger a re-parse of the root document(s)
  const filenames = getInfoFromSettings()
  filenames.then((files): void => {
    files.forEach((file) => {
      const context = FileHandler.Instance.getContext(file)
      ParseDocument(file, '', context)
    })
  })
  console.log('Settings.json update event received.')
})

// Handle the source map request
connection.onRequest(SourceMapRequestType, async (params) => {
  console.log(`Received source map request for file: ${params.text}`)
  const uri = URItoVSCodeURI(params.text)
  const context = FileHandler.Instance.getContext(uri)
  const result = await SaveSourceMap(uri, context)
  const response = `Source map saved: ${result}`
  return response
})

async function SaveSourceMap(
  activeFile: string,
  context: DocumentContext,
): Promise<string | null> {
  const root = FileHandler.Instance.GetTargetFileName(activeFile)
  if (root === undefined) {
    console.log(`No root found for ${activeFile}`)
    return null
  }
  const currentDir = URItoVSCodeURI(process.cwd())
  const relative = path.relative(currentDir, root)
  const mapFile = relative + '.map'

  const sourceMap = context.objectCode.GetSourceMap()

  const output: SourceMapFile = {
    sources: {},
    labels: {},
    symbols: {},
    addresses: {},
  }

  sourceMap.forEach((value, index) => {
    if (value !== null) {
      output.addresses[index] = value
    }
  })
  output.sources = FileHandler.Instance.GetURIRefs()
  output.labels = context.symbolTable.GetAllLabels()
  output.symbols = context.symbolTable.GetAllSymbols()

  const sourceMapString = JSON.stringify(output, null, 2)

  try {
    writeFileSync(mapFile, sourceMapString)
  } catch (error) {
    console.log(`Error writing source map file ${mapFile}: ${error}`)
    return null
  }
  return mapFile
}

function checkUnusedSymbols(
  context: DocumentContext,
  activeFile: string,
): Diagnostic[] {
  const unusedDiagnostics: Diagnostic[] = []
  const symbols = context.symbolTable.GetSymbols()

  for (const [name, symbolData] of symbols.entries()) {
    // Only check symbols defined in the active file
    if (symbolData.GetLocation().uri !== activeFile) continue

    // Skip labels (only check constant declarations)
    if (symbolData.IsLabel()) continue

    // Skip built-in symbols (empty uri)
    if (symbolData.GetLocation().uri === '') continue

    // Check if symbol has any references
    const refs = context.symbolTable.GetReferences(name)
    if (refs === undefined || refs.length === 0) {
      // Strip scope suffix from name for display (e.g., "symbol@0" -> "symbol")
      const displayName = name.includes('@') ? name.split('@')[0] : name
      unusedDiagnostics.push({
        severity: DiagnosticSeverity.Hint,
        range: symbolData.GetLocation().range,
        message: `'${displayName}' is declared but never used`,
        source: 'vscode-beebasm',
        tags: [DiagnosticTag.Unnecessary],
      })
    }
  }

  return unusedDiagnostics
}

// Setup completions handling
const completionHandler = new CompletionProvider()
connection.onCompletion(completionHandler.onCompletion.bind(completionHandler))
connection.onCompletionResolve(
  completionHandler.onCompletionResolve.bind(completionHandler),
)
// Setup signature help handling
const signatureHandler = new SignatureProvider()
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
  const context = FileHandler.Instance.getContext(params.textDocument.uri)
  const doc = params.textDocument.uri
  const docLinks = context.links.get(doc)
  if (docLinks !== undefined) {
    return docLinks
  }
  return []
})

const hoverHandler = new HoverProvider()
connection.onHover(hoverHandler.onHover.bind(hoverHandler))

const semanticTokensProvider = new SemanticTokensProvider()
connection.languages.semanticTokens.on(
  semanticTokensProvider.on.bind(semanticTokensProvider),
)

// Make the text document manager listen on the connection
// for open, change and close text document events
FileHandler.Instance.documents.listen(connection)

// Listen on the connection
connection.listen()
