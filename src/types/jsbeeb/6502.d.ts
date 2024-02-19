
declare module 'jsbeeb/6502' {
	import type { Model } from 'jsbeeb/models';
	import type { Cmos } from 'jsbeeb/cmos';
	import type { DdNoise, FakeDdNoise } from 'jsbeeb/ddnoise';
	import type { Debugger } from 'jsbeeb/web/debug';
	import type { FakeSoundChip, SoundChip } from 'jsbeeb/soundchip';
	import type { Video } from 'jsbeeb/video';
	import type { SysVia } from 'jsbeeb/via';

	export class Flags {
		c: boolean;
		z: boolean;
		i: boolean;
		d: boolean;
		v: boolean;
		n: boolean;
		constructor();
		reset(): void;
		debugString(): string;
		asByte(): number;
	}
	export class Cpu6502
	{
		halted: boolean;
		nmi: boolean;
		pc: number;
		p: Flags;

		video: Video;
		sysvia: SysVia;
		
		targetCycles: number;
		currentCycles: number;
		cycleSeconds: number;

		constructor(model: Model, dbgr: Debugger, video_: Video, soundChip_: SoundChip | FakeSoundChip, ddNoise_: DdNoise | FakeDdNoise, cmos: Cmos, config: any);

		initialise(): Promise<void>;
		reset(hard: boolean): void;
		execute(numCyclesToRun: number): boolean;
		executeInternalFast(): boolean;
		executeInternal(): boolean;
		stop(): void;
		readmem(addr: number): number;
		peekmem(addr: number): number;
		writemem(addr: number, b: number): void;
		setReset(resetOn: boolean): void;

	}

}
