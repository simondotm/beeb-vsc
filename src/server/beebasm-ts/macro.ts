/*************************************************************************************************/
/**
  Derived from macro.cpp/h


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

import { Location } from 'vscode-languageserver'

export class Macro {
  private _filename: string
  private _lineNumber: number
  private _column: number
  private _body: string
  private _name: string
  private _parameters: string[] = []

  constructor(filename: string, lineNumber: number, column: number) {
    this._filename = filename
    this._lineNumber = lineNumber
    this._column = column
    this._body = ''
    this._name = ''
  }

  AddLine(line: string): void {
    this._body += line
  }

  GetBody(): string {
    return this._body
  }

  GetName(): string {
    return this._name
  }

  SetName(name: string, column: number): void {
    this._name = name
    // Update column based on start of name, not end of MACRO keyword
    this._column = column - name.length
  }

  GetNumberOfParameters(): number {
    return this._parameters.length
  }

  GetParameter(index: number): string {
    return this._parameters[index]
  }

  AddParameter(parameter: string): void {
    this._parameters.push(parameter)
  }

  GetLineNumber(): number {
    return this._lineNumber
  }

  GetColumn(): number {
    return this._column
  }

  GetLocation(): Location {
    const loc = {
      uri: this._filename,
      range: {
        start: { line: this._lineNumber, character: this._column },
        end: {
          line: this._lineNumber,
          character: this._column + this._name.length,
        },
      },
    }
    return loc
  }
}

// export class MacroInstance extends SourceCode {
// Moved to sourcecode.ts

export class MacroTable {
  private _macros: Map<string, Macro> = new Map<string, Macro>()
  private _references = new Map<string, Location[]>()
  private static _instance: MacroTable

  public static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this())
  }

  Add(macro: Macro): void {
    if (macro !== undefined) {
      this._macros.set(macro.GetName(), macro)
    }
  }

  Get(name: string): Macro | undefined {
    return this._macros.get(name)
  }

  Exists(name: string): boolean {
    return this._macros.has(name)
  }

  Reset(): void {
    this._macros.clear()
  }

  GetMacros(): Map<string, Macro> {
    return this._macros
  }

  AddReference(name: string, location: Location): void {
    if (!this._references.has(name)) {
      this._references.set(name, [])
    }
    this._references.get(name)?.push(location)
  }

  GetReferences(name: string): Location[] | undefined {
    return this._references.get(name)
  }
}
