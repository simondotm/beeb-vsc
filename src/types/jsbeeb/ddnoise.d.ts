declare module 'jsbeeb/ddnoise' {
	export class DdNoise {
		constructor(context: any);

		initialise(): Promise<void>;
		oneShot(sound: any):	number;
		play(sound: any, loop: boolean): Promise<any>;
		spinUp(): void;
		spinDown(): void;
		seek(diff: number): number;
		mute(): void;
		unmute(): void;
	}

	export class FakeDdNoise {
		constructor();
		initialise(): Promise<void>;
		seek(diff: number): number;
		spinUp(): void;
		spinDown(): void;
		mute(): void;
		unmute(): void;
	}
}
