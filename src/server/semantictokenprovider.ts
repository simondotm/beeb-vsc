import { SemanticTokensParams } from 'vscode-languageserver'
import { AST, GetSemanticTokens } from './ast'
import { URItoVSCodeURI } from './filehandler'

export class SemanticTokensProvider {
  private trees: Map<string, AST[]>

  constructor(trees: Map<string, AST[]>) {
    this.trees = trees
  }

  on(params: SemanticTokensParams): { data: number[] } {
    const doc = URItoVSCodeURI(params.textDocument.uri)
    const asts = this.trees.get(doc)
    if (asts === undefined) {
      return { data: [] }
    }
    let lastLine: number = 0
    const tokens: number[] = []
    // loop through ast for each line
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
        lastLine = currentLine
      }
    }

    return {
      data: tokens,
    }
  }
}
