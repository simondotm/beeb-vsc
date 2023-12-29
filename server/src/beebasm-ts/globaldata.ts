export class GlobalData {
	private static _instance: GlobalData;
	private _pass = 0;
	private _forId = 0;
	private _numAnonSaves = 0;
	private _outputFile = "";
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