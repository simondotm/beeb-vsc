// import { readFile, stat } from 'fs/promises';
import { TextDocuments } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { readFileSync, statSync } from 'fs'
import { URI } from 'vscode-uri'

// Users should always check the TextDocuments collection before using this class
// to avoid trying to access a file owned by the client

export class FileHandler {
  private static _instance: FileHandler
  private _textDocuments: Map<string, { contents: string; modified: Date }> =
    new Map<string, { contents: string; modified: Date }>()
  private includedToParentMap = new Map<string, string>()
  public documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument,
  )

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
    if (this._textDocuments.has(uri)) {
      if (
        this._textDocuments.get(uri)!.modified == this.GetFileModifiedTime(uri)
      ) {
        return this._textDocuments.get(uri)!.contents
      }
    }

    try {
      const fileContents = readFileSync(uri, { encoding: 'utf8' })
      const timestamp = this.GetFileModifiedTime(uri)

      this._textDocuments.set(uri, {
        contents: fileContents,
        modified: timestamp,
      })
      return fileContents
    } catch (error) {
      throw new Error(
        `Unable to read file ${uri.toString()} with error ${error}`,
      )
    }
  }

  private GetFileModifiedTime(uri: string): Date {
    const stats = statSync(uri)
    return stats.mtime
  }

  public GetDocumentText(uri: string): string {
    const cleanPath = URI.parse(uri).fsPath
    const documentsText = this.GetFromDocumentsWithFSPath(cleanPath) // revert if not helping?
    if (documentsText !== '') {
      return documentsText
    }
    // const textDocument = this.documents.get(uri);
    // if (textDocument) {
    // 	return textDocument.getText();
    // }
    // not managed by vscode so read from file directly
    const text = this.ReadTextFromFile(uri)
    return text
  }

  private GetFromDocumentsWithFSPath(uri: string): string {
    // iterate through documents, convert document uri to fsPath and compare to uri
    let docText: string | undefined
    this.documents.keys().forEach((key) => {
      //const document = this.documents.get(key);
      if (URI.parse(key).fsPath === uri) {
        const document = this.documents.get(key)!
        docText = document.getText()
      }
    })
    if (docText !== undefined) {
      return docText
    }
    return ''
  }
}
