/*************************************************************************************************/
/**
	Derived from symboltable.cpp/h


	Copyright (C) Rich Talbot-Watkins 2007 - 2012

	This file is part of BeebAsm.

	BeebAsm is free software: you can redistribute it and/or modify it under the terms of the GNU
	General Public License as published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.

	BeebAsm is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
	even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with BeebAsm, as
	COPYING.txt.  If not, see <http://www.gnu.org/licenses/>.
*/
/*************************************************************************************************/

import { integer, Location } from 'vscode-languageserver';
import { GlobalData } from './globaldata';
import { ObjectCode } from './objectcode';

// can't use Symbol as a type name because it's a reserved word
export class SymbolData {
    private _value: number | string;
    private readonly _isLabel: boolean;
    private readonly _location: Location;
    public constructor(value: number | string, isLabel: boolean, location: Location) {
        this._value = value;
        this._isLabel = isLabel;
        this._location = location;
    }

    IsLabel(): boolean {
        return this._isLabel;
    }
    GetValue(): number | string {
        return this._value;
    }
    SetValue(value: number | string): void {
        this._value = value;
    }
    GetLocation(): Location {
        return this._location;
    }
}

type Label = {
	_addr: integer;
	_scope: integer;
	_identifier: string;
}

type ScopeDetails = {
	uri: string;
	startLine: integer;
	endLine: integer;
}

const noLocation = { uri: '', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };

export class SymbolTable {
    private static _instance: SymbolTable | null = null;
    private _labelScopes: number; // Just like For stack index?
    private readonly _map: Map<string, SymbolData> = new Map<string, SymbolData>();
    private _lastLabel: Label = { _addr: 0, _scope: 0, _identifier: ''};
    private _labelStack: Label[] = [];
    private _labelList: Label[] = [];
    private _scopeDetails: ScopeDetails[] = [];
    private _references = new Map<string, Location[]>();

    private constructor()
    {
        this.Reset();
        this._labelScopes = 0;
    }

    public static get Instance()
    {
        if (this._instance === null) {
            this._instance = new SymbolTable();
        }
        return this._instance;
    }

    // get all symbols where location is not noLocation	
    public GetSymbols(): Map<string, SymbolData> {
        const filtered = new Map(Array.from(this._map.entries()).filter(([_, v]) => v.GetLocation() !== noLocation));
        return filtered;
    }

    GetSymbolByLine(symbolname: string, uri: string, line: number): [SymbolData | undefined, string] {
        // Relies on scopeLevel matching ForScopePtr when each scopeDetail was created
        let search = '';
        for ( let scopeLevel = this._labelScopes - 1; scopeLevel >= 0; scopeLevel-- ) {
            if ( scopeLevel < this._scopeDetails.length
				&& line >= this._scopeDetails[scopeLevel].startLine
				&& line <= this._scopeDetails[scopeLevel].endLine
				&& this._scopeDetails[scopeLevel].uri === uri ) {
                search = `@${scopeLevel}_0` + search;
            }
        }
        search = symbolname + search;
        if ( this.IsSymbolDefined(search) ) {
            // console.log("Found symbol " + search);
            return [this._map.get(search), search];
        }
        // now check global level (no suffix after symbol name and need exact match)
        if ( this.IsSymbolDefined(symbolname) ) {
            // console.log("Found symbol " + symbolname);
            return [this._map.get(symbolname), symbolname];
        }
        return [undefined, ''];
    }

    Reset(): void {
        this._map.clear();
        this._labelScopes = 0;
        this._scopeDetails = [];
        this._references.clear();
        this.AddSymbol( 'PI', Math.PI, noLocation );
        this.AddSymbol( 'P%', 0, noLocation );
        this.AddSymbol( 'TRUE', -1, noLocation );
        this.AddSymbol( 'FALSE', 0, noLocation );
        this.AddSymbol( 'CPU', 0, noLocation ); // easier than having to set in objectcode constructor
    }

    AddSymbol(symbol: string, value: number | string, location: Location, isLabel?: boolean): void {
        if (isLabel === undefined) {
            isLabel = false;
        }
        this._map.set(symbol, new SymbolData(value, isLabel, location));
    }

    GetSymbol(symbol: string): number | string {
        const symb = this._map.get(symbol);
        if (symb === undefined) {
            throw new Error(`Symbol ${symbol} not found`);
            //TODO: flag as error for red underline (catch or just call a method here?)
        }
        return symb.GetValue();
    }

    ChangeSymbol(symbol: string, value: number | string): void {
        const symb = this._map.get(symbol);
        if (symb === undefined) {
            throw new Error(`Symbol ${symbol} not found`);
        }
        symb.SetValue(value);
    }

    RemoveSymbol(symbol: string): void {
        const symb = this._map.get(symbol);
        if (symb === undefined) {
            throw new Error(`Symbol ${symbol} not found`);
        }
        this._map.delete(symbol);
    }

    IsSymbolDefined(symbol: string): boolean {
        return this._map.has(symbol);
    }

    AddReference(symbol: string, location: Location): void {
        let refs = this._references.get(symbol);
        if (refs === undefined) {
            refs = [];
            this._references.set(symbol, refs);
        }
        refs.push(location);
    }

    GetReferences(symbol: string): Location[] | undefined {
        return this._references.get(symbol);
    }

    AddLabel(symbol: string): void {
        if (GlobalData.Instance.IsSecondPass()) {
            const addr = ObjectCode.Instance.GetPC();
            const identifier = (this._labelStack.length === 0 ? '' : this._labelStack[this._labelStack.length - 1]._identifier) + '.' + symbol;
            this._lastLabel = { _addr: addr, _scope: this._labelScopes, _identifier: identifier };
            this._labelList.push(this._lastLabel);
        }
        // TODO - check if can add symbol on second pass, currently getting deleted after first pass and not re-added
    }

    PushBrace(uri: string, startLine: number, forID: number): void {
        if (GlobalData.Instance.IsSecondPass()) {
            const addr = ObjectCode.Instance.GetPC();
            if (this._lastLabel!._addr !== addr) {
                const label = '._' + (this._labelScopes - this._lastLabel!._scope);
				this._lastLabel!._identifier = (this._labelStack.length === 0 ? '' : this._labelStack[this._labelStack.length - 1]._identifier) + label;
				this._lastLabel!._addr = addr;
            }
			this._lastLabel!._scope = this._labelScopes;
			this._scopeDetails.push({uri: uri, startLine: startLine, endLine: -1 });
			this._labelScopes++;
			this._labelStack.push(this._lastLabel!);
        }
    }

    PopScope(endLine = -1, forID = -1): void {
        if (GlobalData.Instance.IsSecondPass()) {
            this._labelStack.pop();
            this._lastLabel = (this._labelStack.length === 0 ? { _addr: 0, _scope: 0, _identifier: ''} : this._labelStack[this._labelStack.length - 1]);
            if ( forID !== -1 ) {
                this._scopeDetails[forID].endLine = endLine;
            }
        }
    }

    PushFor(symbol: string, value: number, uri: string, startLine = -1, forID = -1): void {
        if (GlobalData.Instance.IsSecondPass()) {
            const addr = ObjectCode.Instance.GetPC();
            symbol = symbol.substr(0, symbol.indexOf('@'));
            const label = '._' + symbol + '_' + value;
			this._lastLabel!._identifier += label;
			this._lastLabel!._addr = addr;
			this._lastLabel!._scope = this._labelScopes;
			if ( startLine !== -1) {
			    this._scopeDetails.push({ uri: uri, startLine: startLine, endLine: -1 });
			}
			this._labelScopes++;
			this._labelStack.push(this._lastLabel!);
        }
    }

}