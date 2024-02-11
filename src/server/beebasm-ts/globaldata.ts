/*************************************************************************************************/
/**
	Derived from globaldata.cpp/h


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

export class GlobalData {
	private static _instance: GlobalData;
	private _pass = 0;
	private _forId = 0;
	private _numAnonSaves = 0;
	private _outputFile = '';
	private _assemblyTime = new Date();

	private constructor()
	{
		//TBD
	}

	public static get Instance()
	{
		// Do you need arguments? Make it a regular static method instead.
		return this._instance || (this._instance = new this());
	}

	IsFirstPass(): boolean {
		return this._pass === 0;
	}

	IsSecondPass(): boolean {
		return this._pass === 1;
	}

	GetPass(): number {
		return this._pass;
	}

	SetPass(pass: number): void {
		this._pass = pass;
	}

	GetNextForId(): number {
		return this._forId++;
	}

	ResetForId(): void {
		this._forId = 0;
	}

	GetOutputFile(): string {
		return this._outputFile;
	}

	SetOutputFile(file: string): void {
		this._outputFile = file;
	}

	IncNumAnonSaves(): void {
		this._numAnonSaves++;
	}

	GetNumAnonSaves(): number {
		return this._numAnonSaves;
	}

	GetAssemblyTime(): Date {
		return this._assemblyTime;
	}
}