import { Hover, MarkupContent, HoverParams } from 'vscode-languageserver';
import { AST, Opcode, Command, UnaryOp, SymbolOrLabel } from './ast';
import { opcodeData, opcodeinfo, beebasmCommands, beebasmFunctions } from './shareddata';
import { URI } from 'vscode-uri';
import { SymbolTable } from './beebasm-ts/symboltable';
import { FileHandler } from './filehandler';

export class HoverProvider {
	private trees: Map<string, AST[]>;
	
	constructor (trees: Map<string, AST[]>) {
		this.trees = trees;
	}

    onHover(params: HoverParams): Hover | null {
		const docTrees = this.trees.get(URI.parse(params.textDocument.uri).fsPath);
		const location = params.position;
		if (docTrees !== undefined) {
			const lineTree = docTrees[location.line];
			if (lineTree !== undefined) {
				// Assembly opcode information
				const opcode = Opcode(lineTree, location.character);
				if (opcode !== -1) {
					const info = opcodeData.get(opcode);
					if (info !== undefined) {
						const mdText: MarkupContent = {
							kind: 'markdown',
							value: this.OpcodeHover(info)
						};
						return {contents: mdText};
					}
				}
				// Command information
				const command = Command(lineTree, location.character);
				if (command !== '') {
					// try to find in list of commands beebasmCommands
					// iterate through beebasmCommands looking for a match
					for (const cmd of beebasmCommands) {
						if (cmd.label === command) {
							const mdText: MarkupContent = {
								kind: 'markdown',
								value: `## ${cmd.label}
---
${cmd.documentation?.value}`
							};
							return {contents: mdText};
						}
					}
				}
				// Function information
				const func = UnaryOp(lineTree, location.character);
				if (func !== '') {
					// try to find in list of commands beebasmCommands
					// iterate through beebasmCommands looking for a match
					for (const cmd of beebasmFunctions) {
						if (cmd.label === func.replace(/\(/, '')) {
							const mdText: MarkupContent = {
								kind: 'markdown',
								value: `## ${cmd.label}
---
${cmd.documentation?.value}
---
${cmd.parameters.map((p) => `* ${p.label}: ${p.documentation}`).join('\n')}
---
Return: ${cmd.return}`
							};
							return {contents: mdText};
						}
					}
				}
				// Symbols and labels
				const symbol = SymbolOrLabel(lineTree, location.character);
				if (symbol !== '') {
					
					const [defn, _] = SymbolTable.Instance.GetSymbolByLine(symbol, location.line);
					if (defn === undefined) {
						return null;
					}
					const loc = defn.GetLocation();
					const document = FileHandler.Instance.GetDocumentText(loc.uri);
					if (document === undefined) {
						return null;
					}
					const line = document.split(/\r?\n/g)[loc.range.start.line];
					const mdText: MarkupContent = {
						kind: 'markdown',
						value: [
							"```beebasm",
							line,
							"```"
						].join('\n')
					};
					return {contents: mdText};
				}
			}
		}
		return null;
	}

	private OpcodeHover(info: opcodeinfo): string {
		return `## ${info.mnemonic}
---
${info.description}  
Operation: ${info.operation}  
Addressing mode: ${info.addressing}  
Opcode: $${info.bytecode}  
Cycles: ${info.cycles}
---
${this.getFlagsTable(info.flags)}`;
	}


	/**
	 * Returns the flags as table for markdown. E.g
	 * "|N|V|_|B|D|I|Z|C|  
	 *  |-|-|-|-|-|-|-|-|  
	 *  |*|*|*|?|1|-|-|-|" with separator indicating that the contents are centered.
	 */
	private getFlagsTable(flags: string): string {
		/* Flag meanings:
		-  Flag unaffected
		*  Flag affected
		0  Flag reset
		1  Flag set
		?  Unknown
		Order: NV_BDIZC */

		if (flags.length === 0) {
			flags = '--------';
		}

		// Add a '|' between each character
		const arr = Array.from(flags);
		const tf = arr.join('|');

		// Create center-aligned table
		const table = 
		'|N|V|_|B|D|I|Z|C|\n' +
		'|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|\n' +
		'|' + tf + '|';

		return table;
	}
}
	
