// abstract syntax tree for saving the parsed format of each line
export enum ASTType {
  Line, // root for LineParser
  Command, // includes labels, comments and braces defining code blocks. AKA "tokens"
  Function, // includes unary +/- and callable functions
  Expression,
  VariableDeclaration,
  BinaryOp,
  UnaryOp, // Redundant? Same as function?
  Assembly,
  Value,
  MacroCall,
  Symbol,
}

export type AST = {
  type: ASTType
  value: string | number
  startColumn: number
  children: AST[]
}

const OPCODE_LENGTH = 3
export function GetOpcodeFromAST(ast: AST, position: number): number {
  for (const child of ast.children) {
    if (
      child.type === ASTType.Assembly &&
      child.startColumn <= position &&
      child.startColumn + OPCODE_LENGTH > position
    ) {
      return Number(child.value)
    }
  }
  return -1
}

// Command e.g. PRINT
export function GetCommandFromAST(ast: AST, position: number): string {
  for (const child of ast.children) {
    if (
      child.type === ASTType.Command &&
      child.startColumn <= position &&
      child.startColumn + String(child.value).length > position
    ) {
      return String(child.value)
    }
  }
  return ''
}

// UnaryOp e.g. CHR$()
// Need to search whole tree since can be nested
export function GetUnaryOpFromAST(ast: AST, position: number): string {
  return GetStringRefByType(ast, position, ASTType.UnaryOp)
}

export function GetSymbolOrLabelFromAST(ast: AST, position: number): string {
  return GetStringRefByType(ast, position, ASTType.Symbol)
}

export function GetMacroCallFromAST(ast: AST, position: number): string {
  return GetStringRefByType(ast, position, ASTType.MacroCall)
}

function GetStringRefByType(
  ast: AST,
  position: number,
  asttype: ASTType,
): string {
  const queue: AST[] = []
  queue.push(ast)
  while (queue.length > 0) {
    const node = queue.shift()
    if (node !== undefined) {
      if (
        node.type === asttype &&
        node.startColumn <= position &&
        node.startColumn + String(node.value).length > position
      ) {
        return String(node.value)
      }
      for (const child of node.children) {
        queue.push(child)
      }
    }
  }
  return ''
}

export function GetSemanticTokens(ast: AST, lineNum: number): number[] {
  const tokens: number[] = []
  const queue: AST[] = []
  queue.push(ast)
  while (queue.length > 0) {
    const node = queue.shift()
    if (node !== undefined) {
      if (node.type === ASTType.MacroCall) {
        tokens.push(lineNum)
        tokens.push(node.startColumn)
        tokens.push((node.value as string).length)
        tokens.push(0) // tokenType (index into tokenTypes declared in server capabilities)
        tokens.push(0) // tokenModifiers (index into tokenModifiers declared in server capabilities)
      }
      for (const child of node.children) {
        queue.push(child)
      }
    }
  }
  return tokens
}

export function GetEndColumn(
  lineast: AST,
  column: number,
  linetext: string,
): number {
  // Going to need to do some light parsing to find the end column
  // Can start from "end" of the statement and work backwards
  // End of statement is either end of line if last statement in line
  // or 1 character before the start of the next statement if not last statement
  let statementText: string | undefined = undefined
  if (lineast.children.length > 1) {
    // find child that corresponds to the current column
    let i = 0
    for (; i < lineast.children.length; i++) {
      if (lineast.children[i].startColumn === column) {
        break
      }
    }
    // If not the last child, save the statement text
    if (i < lineast.children.length - 1) {
      statementText = linetext.substring(
        column,
        lineast.children[i + 1].startColumn,
      )
    }
  }
  // if statementText is not set, then we are at the last (or only) child
  if (statementText === undefined) {
    statementText = linetext.substring(column)
  }

  // now we do some slight clean-up to allow for whitespace at the end of the statement
  return column + statementText.trimEnd().length
}
