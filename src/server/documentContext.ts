import { GlobalData } from './beebasm-ts/globaldata';
import { SymbolTable } from './beebasm-ts/symboltable';
import { MacroTable } from './beebasm-ts/macro';
import { ObjectCode } from './beebasm-ts/objectcode';
import { AST } from './ast';
import { DocumentLink } from 'vscode-languageserver/node';

export class DocumentContext {
    public globalData: GlobalData
    public symbolTable: SymbolTable
    public macroTable: MacroTable
    public objectCode: ObjectCode
    public trees: Map<string, AST[]>
    public links: Map<string, DocumentLink[]>

    constructor() {
        this.globalData = new GlobalData()
        this.symbolTable = new SymbolTable(this)
        this.macroTable = new MacroTable()
        this.objectCode = new ObjectCode(this)
        this.trees = new Map<string, AST[]>()
        this.links = new Map<string, DocumentLink[]>()
    }

    public reset(): void {
        this.globalData.reset()
        this.symbolTable.Reset()
        this.macroTable.Reset()
        this.objectCode.Reset()
        this.trees.clear()
        this.links.clear()
    }
}
