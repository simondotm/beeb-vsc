// This script is loaded by the WebView
console.log('Hello, Wordffld!');

declare global {
    interface Window {
			theEmulator: Emulator;
			JSBEEB_RESOURCES: Record<string, string>
			JSBEEB_DISC?: string
		}
}

// let window: any;
// let document: any;

import $ from 'jquery';
import _ from 'underscore';
import { Cpu6502 } from 'jsbeeb/6502';
import { Canvas, GlCanvas, bestCanvas} from 'jsbeeb/canvas';
import { Video } from 'jsbeeb/video';
import { Debugger } from 'jsbeeb/web/debug';
import { SoundChip, FakeSoundChip } from 'jsbeeb/soundchip';
import { DdNoise, FakeDdNoise } from 'jsbeeb/ddnoise';
import { Model, findModel } from 'jsbeeb/models';
import { Cmos, CmosData } from 'jsbeeb/cmos';
import * as utils from 'jsbeeb/utils';
import Snapshot from './snapshot';
import { BaseDisc, emptySsd } from 'jsbeeb/fdc';
 

import { ClientCommand, ClientMessage, HostCommand, HostMessage } from '../types/shared/messages';

import { vscode } from './vscode';

// utils.runningInNode = false;

// utils.setBaseUrl('jsbeeb/');

utils.setLoader( (url: string) => {
	const newUrl = window.JSBEEB_RESOURCES[url];
	console.log('Loading ' + url + ' as ' + newUrl);
	return utils.defaultLoadData(newUrl);
});

const BotStartCycles = 725000; // bbcmicrobot start time
const ClocksPerSecond = (2 * 1000 * 1000) | 0;
const MaxCyclesPerFrame = ClocksPerSecond / 10;
const urlParams = new URLSearchParams(window.location.search);

const beebjit_incoming = false;
const model = findModel('MasterADFS');
let modelName = model.name; //'BBC Micro Model B';


function postMessage(message: ClientMessage) {
	vscode.postMessage(message);
}


export class Emulator {

	root: JQuery<HTMLElement>; // root element
	screen: JQuery<HTMLElement>; // screen element
	canvas: Canvas | GlCanvas;
	emuStatus: HTMLElement; // = document.getElementById('emu_status');
	frames: number;
	frameSkip: number;
	// resizer: ScreenResizer;
	leftMargin: number;
	rightMargin: number;
	topMargin: number;
	bottomMargin: number;
	loopEnabled: boolean;
	loopStart: number;
	loopLength: number;
	state: any;
	snapshot: Snapshot;
	loop: boolean;
	showCoords: boolean;
	video: Video;
	soundChip: SoundChip | FakeSoundChip;
	ddNoise: DdNoise | FakeDdNoise;
	dbgr: Debugger;
	cpu: Cpu6502;
	ready: any;
	lastFrameTime: number;
	onAnimFrame: any;
	running: boolean = false;
	lastShiftLocation: number;
	lastAltLocation: number;
	lastCtrlLocation: number;



	constructor(root: JQuery<HTMLElement>) {
		console.log('Emulator constructor');
		this.root = root;
		const screen = this.root.find('.screen');
		if (!screen) {
			throw new Error('No screen element found');
		}
		this.screen = screen;
		//this.screen = document.getElementById('screen');
		//		const screen = document.getElementById('screen'); // this.root.find('.screen');
		this.canvas = bestCanvas(screen[0]);
		const emuStatus = document.getElementById('emu_status'); 
		if (!emuStatus) {
			throw new Error('No emu_status element found');
		}
		this.emuStatus = emuStatus;
		this.frames = 0;
		this.frameSkip = 0;
		// resizer not great in webview
		// this.resizer = new ScreenResizer(screen);
		// margin sets how much of the fully emulated screen is visible/cropped
		this.leftMargin = 115;
		this.rightMargin = 130;
		this.topMargin = 45;
		this.bottomMargin = 30;
		// this.leftMargin = 0;
		// this.rightMargin = 0;
		// this.topMargin = 0;
		// this.bottomMargin = 0;


		this.loopEnabled = true;
		this.loopStart =  60680000;
		this.loopLength = 6000000 + 320000;
		this.state = null;
		this.snapshot = new Snapshot();
		this.loop = (urlParams.get('loop')) ? true : false;
		this.showCoords = false; // coordinate display mode

		this.video = new Video(model.isMaster, this.canvas.fb32, _.bind(this.paint, this));

		this.soundChip = new FakeSoundChip();
		this.ddNoise = new FakeDdNoise();

		this.dbgr = new Debugger(this.video);
		const cmos = new Cmos({
			load: function () {
				if (window.localStorage.cmosRam) {
					return JSON.parse(window.localStorage.cmosRam);
				}
				return null;
			},
			save: function (data: CmosData) {
				window.localStorage.cmosRam = JSON.stringify(data);
			},
		});
		const config = {};
		this.cpu = new Cpu6502(
			model,
			this.dbgr,
			this.video,
			this.soundChip,
			this.ddNoise,
			undefined, // music5000
			cmos,
			config,
			undefined // econet
		);

		// Patch this version of JSbeeb to stop it reseting cycle count.
		// Number.MAX_SAFE_INTEGER should gives us plenty of headroom
		this.cpu.execute = function (numCyclesToRun: number) {
			this.halted = false;
			this.targetCycles += numCyclesToRun;
			return this.executeInternalFast();
		};

		screen.mousemove((event: any) => this.mouseMove(event));
		screen.mouseleave(() => this.mouseLeave());
		screen.keyup((event:any) => this.keyUp(event));
		screen.keydown((event:any) => this.keyDown(event));
		screen.blur(() => this.clearKeys());
		setInterval(this.timer.bind(this), 1000);
		this.lastFrameTime = 0;
		this.onAnimFrame = _.bind(this.frameFunc, this);
		this.ready = false;

		this.lastShiftLocation = this.lastAltLocation = this.lastCtrlLocation = 0;
	}

	async initialise() {
		await Promise.all([this.cpu.initialise(), this.ddNoise.initialise()]);
		this.ready = true;
		postMessage({ command: ClientCommand.EmulatorReady });
	}

	gxr(){
		model.os.push('gxr.rom');
		modelName += ' | GXR';
	}

	timer() {

		if (!beebjit_incoming && !this.showCoords) {
			this.emuStatus.innerHTML = `${modelName} | ${Math.floor(this.cpu.currentCycles/2000000)} s`;
		}
	}

	start() {
		if (this.running) return;
		this.running = true;
		window.requestAnimationFrame(this.onAnimFrame);
	}

	pause() {
		this.running = false;
	}

	// async beebjit(tokenised: any) {
	// 	this.pause();

	// 	beebjit_incoming = true;

	// 	function myCounter() {
	// 		this.emuStatus.innerHTML +='.';
	// 		if (this.emuStatus.innerHTML.length>18) this.emuStatus.innerHTML = 'Calling beebjit';
	// 	}
	// 	this.emuStatus.innerHTML = 'Calling beebjit';
	// 	const counterInterval = setInterval(myCounter.bind(this), 200);
	// 	const basic = btoa(tokenised).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	// 	const response = await fetch(
	// 		'https://api.bbcmic.ro/beta?saveAddress=0&saveLength=8000&basic=' + basic,
	// 		{
	// 			headers: {
	// 				'x-api-key': 'YrqLWPW1mvbEIJs1bT0m3DAoTJLKd9xaGEQaI5xa',
	// 			},
	// 		}
	// 	);
	// 	beebjit_incoming = false;
	// 	this.state = await response.json();
	// 	const t0 = performance.now();
	// 	this.snapshot.load(this.state,this.cpu);
	// 	this.cpu.currentCycles = 2000000*60*60*3; // 3 hours
	// 	this.cpu.targetCycles = 2000000*60*60*3;
	// 	this.loopStart =  2000000*60*60*3;
	// 	this.loopLength= 6000000 + 320000;

	// 	const t1 = performance.now();
	// 	const t2 = Math.round((t1 - t0)*1000)/1000;
	// 	console.log(`State snapshot loaded in ${t2}ms.`);

	// 	this.start();

	// 	clearInterval(counterInterval);
	// 	this.timer();
	// }

	async runProgram(tokenised: any) {
		if (!this.ready) return;
		console.log(this.cpu.currentCycles);
		this.cpu.reset(true);
		const processor = this.cpu;
		await processor.execute(BotStartCycles); // match bbcmicrobot
		const page = processor.readmem(0x18) << 8;
		for (let i = 0; i < tokenised.length; ++i) {
			processor.writemem(page + i, tokenised.charCodeAt(i));
		}
		// Set VARTOP (0x12/3) and TOP(0x02/3)
		const end = page + tokenised.length;
		const endLow = end & 0xff;
		const endHigh = (end >>> 8) & 0xff;
		processor.writemem(0x02, endLow);
		processor.writemem(0x03, endHigh);
		processor.writemem(0x12, endLow);
		processor.writemem(0x13, endHigh);
		this.writeToKeyboardBuffer('RUN\r');
		this.start();
	}

	writeToKeyboardBuffer(text: any) {
		const processor = this.cpu;
		const keyboardBuffer = 0x0300; // BBC Micro OS 1.20
		const IBPaddress = 0x02e1; // input buffer pointer
		let inputBufferPointer = processor.readmem(IBPaddress);
		for (let a = 0; a < text.length; a++) {
			processor.writemem(keyboardBuffer + inputBufferPointer, text.charCodeAt(a));
			inputBufferPointer++;
			if (inputBufferPointer > 0xff) {
				inputBufferPointer = 0xe0;
			}
		}
		processor.writemem(IBPaddress, inputBufferPointer);
	}

	frameFunc(now: any) {
		window.requestAnimationFrame(this.onAnimFrame);
		// Take snapshot
		if (this.loop == true && this.state == null && this.cpu.currentCycles >= this.loopStart) {
			this.pause();
			this.state = this.snapshot.save(this.cpu).state;
			this.start();
			console.log('snapshot taken at '+this.cpu.currentCycles+' cycles');
		}

		// Loop back
		if (this.loop == true && this.state !== null && this.cpu.currentCycles >= this.loopStart+this.loopLength) {
			this.pause();
			this.snapshot.load(this.state,this.cpu);
			this.cpu.currentCycles = this.loopStart;
			this.cpu.targetCycles = this.loopStart;
			this.start();
		}

		if (this.running && this.lastFrameTime !== 0) {
			const sinceLast = now - this.lastFrameTime;
			let cycles = ((sinceLast * ClocksPerSecond) / 1000) | 0;
			cycles = Math.min(cycles, MaxCyclesPerFrame);
			try {
				if (!this.cpu.execute(cycles)) {
					this.running = false; // TODO: breakpoint
				}
			} catch (e) {
				this.running = false;
				this.dbgr.debug(this.cpu.pc);
				throw e;
			}
		}
		this.lastFrameTime = now;
	}

	paint(minx: any, miny: any, maxx: any, maxy: any) {
		this.frames++;
		if (this.frames < this.frameSkip) return;
		this.frames = 0;
		const teletextAdjustX = this.video && this.video.teletextMode ? 15 : 0;
		this.canvas.paint(
			minx + this.leftMargin + teletextAdjustX,
			miny + this.topMargin,
			maxx - this.rightMargin + teletextAdjustX,
			maxy - this.bottomMargin
		);
	}

	keyDown(event: any) {
		if (!this.running) return;

		const code = this.keyCode(event);
		const processor = this.cpu;
		if (code === utils.keyCodes.HOME && event.ctrlKey) {
			this.pause();
		} else if (code === utils.keyCodes.F12 || code === utils.keyCodes.BREAK) {
			processor.setReset(true);
		} else {
			processor.sysvia.keyDown(code, event.shiftKey);
		}
		event.preventDefault();
	}

	clearKeys() {
		const processor = this.cpu;
		if (processor && processor.sysvia) processor.sysvia.clearKeys();
	}

	mouseLeave() {
		this.showCoords = false;
		this.timer();
	}

	mouseMove(event: any) {
		this.showCoords = true;
		const processor = this.cpu;
		const screen = this.screen; // this.root.find('.screen');
		const screenMode = processor.readmem(0x0355);
		let W;
		let H;
		let graphicsMode = true;
		switch (screenMode) {
		case 0:
			W = 80; H = 32; break;
		case 1:
		case 4:
			W = 40; H = 32; break;
		case 2:
		case 5:
			W = 20; H = 32; break;
		case 3:
			W = 80; H = 25.6; graphicsMode = false; break;
		case 6:
			W = 40; H = 25.6; graphicsMode = false; break;
		case 7:
			W = 40; H = 25.6; graphicsMode = false; break;
		default:
			// Unknown screen mode!
			return;
		}
		// 8 and 16 here are fudges to allow for a margin around the screen
		// canvas - not sure exactly where that comes from...
		let x = event.offsetX - 8;
		let y = event.offsetY - 8;
		const sw = (screen.width() ?? 16) - 16;
		const sh = (screen.height() ?? 16) - 16;
		const X = Math.floor(x * W / sw);
		const Y = Math.floor(y * H / sh);
		let html = `Text: (${X},${Y})`;
		if (graphicsMode) {
			// Graphics Y increases up the screen.
			y = sh - y;
			x = Math.floor(x * 1280 / sw);
			y = Math.floor(y * 1024 / sh);
			html += ` &nbsp; Graphics: (${x},${y})`;
		}
		this.emuStatus.innerHTML = html;
	}

	keyUp(event: any) {
		// Always let the key ups come through.
		const code = this.keyCode(event);
		const processor = this.cpu;
		if (processor && processor.sysvia) processor.sysvia.keyUp(code);
		if (!this.running) return;
		if (code === utils.keyCodes.F12 || code === utils.keyCodes.BREAK) {
			processor.setReset(false);
		}
		event.preventDefault();
	}

	keyCode(event: any) {
		const ret = event.which || event.charCode || event.keyCode;
		const keyCodes = utils.keyCodes;
		switch (event.location) {
		default:
			// keyUp events seem to pass location = 0 (Chrome)
			switch (ret) {
			case keyCodes.SHIFT:
				return this.lastShiftLocation === 1
					? keyCodes.SHIFT_LEFT
					: keyCodes.SHIFT_RIGHT;
			case keyCodes.ALT:
				return this.lastAltLocation === 1 ? keyCodes.ALT_LEFT : keyCodes.ALT_RIGHT;
			case keyCodes.CTRL:
				return this.lastCtrlLocation === 1
					? keyCodes.CTRL_LEFT
					: keyCodes.CTRL_RIGHT;
			}
			break;
		case 1:
			switch (ret) {
			case keyCodes.SHIFT:
				this.lastShiftLocation = 1;
				return keyCodes.SHIFT_LEFT;

			case keyCodes.ALT:
				this.lastAltLocation = 1;
				return keyCodes.ALT_LEFT;

			case keyCodes.CTRL:
				this.lastCtrlLocation = 1;
				return keyCodes.CTRL_LEFT;
			}
			break;
		case 2:
			switch (ret) {
			case keyCodes.SHIFT:
				this.lastShiftLocation = 2;
				return keyCodes.SHIFT_RIGHT;

			case keyCodes.ALT:
				this.lastAltLocation = 2;
				return keyCodes.ALT_RIGHT;

			case keyCodes.CTRL:
				this.lastCtrlLocation = 2;
				return keyCodes.CTRL_RIGHT;
			}
			break;
		case 3: // numpad
			switch (ret) {
			case keyCodes.ENTER:
				return utils.keyCodes.NUMPADENTER;

			case keyCodes.DELETE:
				return utils.keyCodes.NUMPAD_DECIMAL_POINT;
			}
			break;
		}

		return ret;
	}
}



async function initialise() {


	const root = $('#emulator'); // document.getElementById('emulator');
	const emulator = new Emulator(root);
	window.theEmulator = emulator;
	await emulator.initialise();

	const discUrl = window.JSBEEB_DISC;
	if (discUrl) {
		const fdc = emulator.cpu.fdc;
		const discData = await utils.defaultLoadData(discUrl);
		const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
		emulator.cpu.fdc.loadDisc(0, discImage);
	}
	emulator.start();


}

async function loadDisc(discUrl: string) {
	const emulator = window.theEmulator;
	if (!emulator.ready) {
		console.log('Emulator not ready to load disc yet.');
		return;
	}
	if (discUrl) {
		console.log('loading disc');
		const fdc = emulator.cpu.fdc;
		const discData = await utils.defaultLoadData(discUrl);
		const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
		emulator.cpu.fdc.loadDisc(0, discImage);
	}else{
		console.log('ejecting disc');
		emptySsd(emulator.cpu.fdc);
	}
}

// Handle the message inside the webview
window.addEventListener('load', event => {
	console.log('window loaded');
	console.log(JSON.stringify(event));
	postMessage({ command: ClientCommand.PageLoaded });
});
window.addEventListener('message', event => {
	const message = event.data as HostMessage; // The JSON data our extension sent
	console.log('message received');
	console.log(JSON.stringify(message));

	switch (message.command) {
	case HostCommand.LoadDisc:
		if (message.url) {
			console.log(`loadDisc=${message.url}`);
			loadDisc(message.url);
		}
		break;
	}
});

initialise().then(() => {
	// And we're ready to go here.
});
