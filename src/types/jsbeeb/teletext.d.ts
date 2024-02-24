declare module 'jsbeeb/teletext' {
	export class Teletext {
		constructor();
		prevCol: number;
		holdOff: boolean;
		col: number;
		bg: number;
		sep: boolean;
		dbl: boolean;
		oldDbl: boolean;
		secondHalfOfDouble: boolean;
		wasDbl: boolean;
		gfx: boolean;
		flash: boolean;
		flashOn: boolean;
		flashTime: number;
		heldChar: boolean;
		holdChar: number;
		dataQueue: [number, number, number, number]; 
		scanlineCounter: number;
		levelDEW: boolean;
		levelDISPTMG: boolean;
		levelRA0: boolean;

		normalGlyphs: Uint32Array;
		graphicsGlyphs: Uint32Array;
		separatedGlyphs: Uint32Array;
		colour: Uint32Array;

		nextGlyphs: Uint32Array;
		curGlyphs: Uint32Array;
		heldGlyphs: Uint32Array;
		
		init(): void;

		static setNextChars(): void;
		static handleControlCode(data: number): void;
		static fetchData(data: number): void;
		static setDEW(level: boolean): void;
		static setDISPTMG(level: boolean): void;
		static setRA0(level: boolean): void;
		static render(buf: Uint32Array, offset: number): void;
	}
}
