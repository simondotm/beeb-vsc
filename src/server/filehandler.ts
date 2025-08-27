import { TextDocuments, Files } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { readFileSync, statSync } from 'fs'
import { URI } from 'vscode-uri'
import { SourceFileMap } from '../types/shared/debugsource'
import path from 'path'
import { DocumentContext } from './documentContext';

// The TextDocuments collection is the files managed by vscode
// For any included files, we manage with the _textDocuments map
export class FileHandler {
  private static _instance: FileHandler
  private _textDocuments: Map<string, { contents: string; modified: Date }> = new Map<string, { contents: string; modified: Date }>()
  private contexts: Map<string, DocumentContext> = new Map();
  private includedToParentMap = new Map<string, string>()
  private workspaceRoot: string | undefined
  public documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument,
  )

  public getContext(uri: string): DocumentContext {
    const rootUri = this.getRootUri(uri);
    let context = this.contexts.get(rootUri);
    if (!context) {
      context = new DocumentContext();
      this.contexts.set(rootUri, context);
    }
    return context;
  }

  // This is a placeholder. Need to test how to handle context for files without root
  private getRootUri(uri: string): string {
    const targetFileName = this.GetTargetFileName(uri);
    return targetFileName !== undefined ? targetFileName : uri;
  }

  public static get Instance() {
    return this._instance || (this._instance = new this())
  }

  public GetTargetFileName(fileName: string): string | undefined {
    // Recursively get the parent file name until
    // the parent file name is the same as the file name
    let targetFileName = this.includedToParentMap.get(fileName)
    if (targetFileName === undefined) {
      return undefined
    }
    while (targetFileName !== fileName) {
      fileName = targetFileName
      targetFileName = this.includedToParentMap.get(fileName)
      if (targetFileName === undefined) {
        return undefined // shouldn't end up here
      }
    }
    return targetFileName
  }

  public SetTargetFileName(fileName: string, targetFileName: string): void {
    this.includedToParentMap.set(fileName, targetFileName)
  }

  public ClearIncludeMapping(): void {
    this.includedToParentMap.clear()
  }

  public ReadTextFromFile(uri: string): string {
    const uriPath = Files.uriToFilePath(uri) ?? ''
    if (this._textDocuments.has(uri)) {
      if (
        this._textDocuments.get(uri)!.modified.getTime() ==
        this.GetFileModifiedTime(uriPath).getTime()
      ) {
        return this._textDocuments.get(uri)!.contents
      }
    }

    try {
      if (uriPath === '') {
        throw new Error(
          `Unable to read file ${uri} - could not convert to path`,
        )
      }
      const fileContents = readFileSync(uriPath, { encoding: 'utf8' })
      const timestamp = this.GetFileModifiedTime(uriPath)

      this._textDocuments.set(uri, {
        contents: fileContents,
        modified: timestamp,
      })
      return fileContents
    } catch (error) {
      throw new Error(`Unable to read file ${uriPath} with error ${error}`)
    }
  }

  private GetFileModifiedTime(uri: string): Date {
    const stats = statSync(uri)
    return stats.mtime
  }

  public GetDocumentText(uri: string): string {
    const cleanPath = uri //Files.uriToFilePath(uri)
    if (cleanPath === undefined) {
      return ''
    }
    const documentsText = this.GetFromDocumentsWithFSPath(cleanPath)
    if (documentsText !== '') {
      return documentsText
    }
    // not managed by vscode so read from file directly
    const text = this.ReadTextFromFile(uri)
    return text
  }

  private GetFromDocumentsWithFSPath(uri: string): string {
    // iterate through documents, convert document uri to fsPath and compare to uri
    let docText: string | undefined
    this.documents.keys().forEach((key) => {
      if (key === uri) {
        const document = this.documents.get(key)!
        docText = document.getText()
      }
    })
    if (docText !== undefined) {
      return docText
    }
    return ''
  }

  public GetWorkspaceRoot(): string | undefined {
    return this.workspaceRoot
  }

  public SetWorkspaceRoot(root: string): void {
    this.workspaceRoot = root
  }

  public GetURIRefs(): SourceFileMap {
    // const refs: SourceFileMap[] = []
    const currentDir = URItoVSCodeURI(process.cwd())
    const sourceFileMap: SourceFileMap = {}
    this.includedToParentMap.forEach((_value, key) => {
      const relative = path.relative(currentDir, key)
      sourceFileMap[cyrb53(key)] = relative // Keeping full path to generate key (consistent with sourcecode.ts)
    })
    return sourceFileMap
  }
}

/*
  cyrb53 (c) 2018 bryc (github.com/bryc)
  License: Public domain (or MIT if needed). Attribution appreciated.
  A fast and simple 53-bit string hash function with decent collision resistance.
  Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
  https://stackoverflow.com/a/52171480
*/
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

// Tries to replicate format provided by params passed from vscode
export function URItoVSCodeURI(uri: string): string {
  if (URI.parse(uri).scheme === 'file') {
    return URI.parse(uri).toString()
  }
  return URI.file(uri).toString()
}

export function URItoReference(uri: string): string {
  // puts in format for passing back to client
  return URI.parse(uri).toString()
}
