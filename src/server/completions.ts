import {
  Command,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  InsertTextFormat,
  TextDocuments,
  SignatureHelp,
  SignatureInformation,
} from 'vscode-languageserver/node'
import { beebasmCommands, beebasmFunctions, opcodeData } from './shareddata'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolTable } from './beebasm-ts/symboltable'

const triggerParameterHints = Command.create(
  'Trigger parameter hints',
  'editor.action.triggerParameterHints',
)

const functionCompletions: CompletionItem[] = beebasmFunctions.map((item) => ({
  label: item.label,
  kind: CompletionItemKind.Function,
  insertTextFormat: InsertTextFormat.Snippet,
  insertText: `${item.label}($1)$0`,
  command: triggerParameterHints,
  detail: 'function',
  documentation: item.documentation,
}))
const commandCompletions: CompletionItem[] = beebasmCommands.map((item) => ({
  label: item.command,
  kind: CompletionItemKind.Method,
  insertTextFormat: InsertTextFormat.Snippet,
  insertText: `${item.command} $0`,
  command: triggerParameterHints,
  detail: 'command',
  documentation: item.documentation,
}))
const uniqueOpcodes = new Set<string>()
opcodeData.forEach((item) => {
  uniqueOpcodes.add(item.mnemonic)
})
const opcodeCompletions: CompletionItem[] = Array.from(uniqueOpcodes).map(
  (item) => ({
    label: item,
    kind: CompletionItemKind.Keyword,
    insertTextFormat: InsertTextFormat.PlainText,
    insertText: item,
    detail: 'opcode',
    documentation: '',
  }),
)
const registerCompletions: CompletionItem[] = ['A', 'X', 'Y'].map((item) => ({
  label: item,
  kind: CompletionItemKind.Keyword,
  insertTextFormat: InsertTextFormat.PlainText,
  insertText: item,
  detail: 'register',
  documentation: '',
}))

export class CompletionProvider {
  async onCompletion(_textDocumentPosition: TextDocumentPositionParams) {
    // The parameter contains the position of the text document in
    // which code complete got requested. This filters output by:
    // 1) Symbols and labels in scope at the current position
    // 2) TODO: See if want to filter out commands (if not at the start of a statement)
    // VS Code is then left to filter the remaining results by characters typed so far.

    // Collect all symbols and labels from the SymbolTable
    const uri = _textDocumentPosition.textDocument.uri
    const lineno = _textDocumentPosition.position.line
    const symbols = SymbolTable.Instance.GetSymbolsByLocation(uri, lineno)
    const symbolCompletionItems: CompletionItem[] = [...symbols.entries()].map(
      (item) => ({
        label: item[0],
        kind: item[1].IsLabel()
          ? CompletionItemKind.Reference
          : CompletionItemKind.Variable,
        insertTextFormat: InsertTextFormat.PlainText,
        insertText: item[0],
      }),
    )

    return functionCompletions
      .concat(commandCompletions)
      .concat(opcodeCompletions)
      .concat(registerCompletions)
      .concat(symbolCompletionItems)
  }

  async onCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    return Promise.resolve(item)
  }
}

const signatures: SignatureInformation[] = beebasmCommands.map((item) => ({
  command: item.command,
  label: item.label,
  documentation: item.documentation,
  parameters: item.parameters,
}))

const functionAndCommandIdentifiers = new Set(
  beebasmFunctions
    .map((item) => item.label)
    .concat(beebasmCommands.map((item) => item.command)),
)

export class SignatureProvider {
  private documents
  constructor(documents: TextDocuments<TextDocument> | null = null) {
    this.documents = documents
  }

  async onSignatureHelp(
    _textDocumentPositionParams: TextDocumentPositionParams,
  ): Promise<SignatureHelp | null> {
    const lineno = _textDocumentPositionParams.position.line
    const character = _textDocumentPositionParams.position.character
    if (this.documents === null) {
      return null
    }
    const doc = this.documents.get(_textDocumentPositionParams.textDocument.uri)
    if (!doc) {
      return null
    }
    // Get text from document
    const line = doc.getText().split(/\r?\n/g)[lineno]
    const [functionName, parameterNo] = this.findMatchingFunction(
      line,
      character,
    )
    // filter signatures to only those matching the function name
    const matchingSignatures = signatures.filter(
      (item) => item.label.replace(/ .*/, '') === functionName,
    )
    if (matchingSignatures.length === 0) {
      return null
    }
    return <SignatureHelp>{
      signatures: matchingSignatures,
      activeSignature: 0,
      activeParameter: parameterNo,
    }
  }

  // NB: Public just for unit testing
  public findMatchingFunction(
    line: string,
    character: number,
  ): [string, number] {
    if (this.inComment(line, character)) {
      return ['', 0]
    }
    // Parse text for function name
    // Find all words in line then check against functionAndCommand set
    const pattern = /[a-z][\w$]+/gi
    // Find last word before the character position
    const matches = [...line.matchAll(pattern)]
    let potentialmatch = ''
    let potentialmatchPosition = 0
    matches.forEach((match) => {
      // word must end before the character position
      if (match.index !== undefined) {
        if (match.index + match[0].length <= character) {
          if (functionAndCommandIdentifiers.has(match[0].toUpperCase())) {
            potentialmatch = match[0].toUpperCase()
            potentialmatchPosition = match.index
          }
        }
      }
      // console.log(potentialmatch);
    })

    // Still need to check if within a statement, so search for a colon after the match
    const colonIndex = line.indexOf(':', potentialmatchPosition)
    if (colonIndex !== -1 && colonIndex < character) {
      return ['', 0]
    }

    // Count commas before the character position, excluding those in brackets or quotes
    let commas = 0
    let bracketDepth = 0
    let quoteDepth = 0
    for (
      let i = potentialmatchPosition + potentialmatch.length + 1;
      i < character;
      i++
    ) {
      if (line[i] === '(' && quoteDepth === 0) {
        bracketDepth++
      }
      if (line[i] === ')' && quoteDepth === 0) {
        bracketDepth--
      }
      if (line[i] === '"' && bracketDepth === 0) {
        quoteDepth++
      }
      if (line[i] === '"' && bracketDepth === 0) {
        quoteDepth--
      }
      if (line[i] === ',' && bracketDepth === 0 && quoteDepth === 0) {
        commas++
      }
    }
    // console.log(`potentialmatch: ${potentialmatch}, commas: ${commas}, character: ${character}`);
    return [potentialmatch, commas]
  }

  private inComment(line: string, character: number): boolean {
    // Check if the line is in a comment
    // Comments are after a semi-colon (not in quotes)
    let inQuotes = false
    for (let i = 0; i < character; i++) {
      if (line[i] === '"' || line[i] === "'") {
        inQuotes = !inQuotes
      }
      if (line[i] === ';' && !inQuotes) {
        return true
      }
    }
    return false
  }
}
