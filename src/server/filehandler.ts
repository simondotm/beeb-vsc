import { TextDocuments, Files } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { readFileSync, statSync } from 'fs'
import { URI } from 'vscode-uri'

// The TextDocuments collection is the files managed by vscode
// For any included files, we manage with the _textDocuments map
export class FileHandler {
  private static _instance: FileHandler
  private _textDocuments: Map<string, { contents: string; modified: Date }> =
    new Map<string, { contents: string; modified: Date }>()
  private includedToParentMap = new Map<string, string>()
  public documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument,
  )
  private workspaceRoot: string | undefined

  private constructor() {
    //TBD
  }

  public static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
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

  public Clear(): void {
    this._textDocuments.clear()
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
      throw new Error(`Unable to read file ${uri} with error ${error}`)
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
}

// Tries to replicate format provided by params passed from vscode
export function URItoVSCodeURI(uri: string): string {
  return URI.parse(uri).toString()
  // let fsPath: string
  // try {
  //   if (process.platform === 'win32' && !uri.startsWith('file:/')) {
  //     const unixStyle = uri.replace(/\\/g, '/')
  //     // console.log('unixStyle ' + unixStyle)
  //     fsPath = URI.parse('file:///' + unixStyle).fsPath
  //   } else {
  //     fsPath = URI.parse(uri).fsPath
  //   }
  // } catch (error) {
  //   console.log(`Error converting URI ${uri} to path: ${error}`)
  //   return ''
  // }
  // return fsPath
}

export function URItoReference(uri: string): string {
  // puts in format for passing back to client
  return URI.parse(uri).toString()
}
