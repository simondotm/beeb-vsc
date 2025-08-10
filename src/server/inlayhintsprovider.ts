import { InlayHintParams, InlayHint } from 'vscode-languageserver'
import { AST, ASTType, GetEndColumn } from './ast'
import { FileHandler, URItoVSCodeURI } from './filehandler'
import { opcodeData } from './shareddata'
import { DocumentContext } from './documentContext'

export class InlayHintsProvider {
  public enabled: boolean = false

  constructor() {
  }

  on(params: InlayHintParams): InlayHint[] | null {
    if (!this.enabled) {
      return null
    }
    const uri = URItoVSCodeURI(params.textDocument.uri)
    const context = FileHandler.Instance.getContext(uri)
    const startLine = params.range.start.line
    const endLine = params.range.end.line
    const docTrees = context.trees.get(uri)
    if (docTrees === undefined) {
      return null
    }
    return this.GetHintsForLineRange(startLine, endLine, docTrees, uri)
  }

  public GetHintsForLineRange(
    startLine: number,
    endLine: number,
    docTrees: AST[],
    uri: string,
    codeOverride?: string,
  ): InlayHint[] {
    const hints: InlayHint[] = []
    // We will apply an inlay hint for each opcode found in the AST
    // The hint will be the number of cycles for that opcode, preceded by '⏱'
    let document: string
    if (codeOverride !== undefined) {
      document = codeOverride
    } else {
      document = FileHandler.Instance.GetDocumentText(uri)
    }
    if (document === undefined) {
      return []
    }
    const lines = document.split(/\r?\n/g)
    for (let i = startLine; i <= endLine; i++) {
      const lineTree = docTrees[i]
      if (lineTree === undefined) {
        continue
      }

      for (const child of lineTree.children) {
        if (child.type == ASTType.Assembly) {
          const opcode = Number(child.value)
          if (opcode !== -1) {
            const info = opcodeData.get(opcode)
            const endColumn = GetEndColumn(
              lineTree,
              child.startColumn,
              lines[i],
            )
            hints.push({
              position: {
                line: i,
                character: endColumn,
              },
              label: `⏱ ${info?.cycles}`,
              paddingLeft: true,
            })
          }
        }
      }
    }
    return hints
  }
}
