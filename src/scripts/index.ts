// This script is loaded by the WebView


import $ from 'jquery';
import _ from 'underscore';
import { bestCanvas} from 'jsbeeb/canvas';
import { Model, allModels, findModel } from 'jsbeeb/models';
import * as utils from 'jsbeeb/utils';
import { BaseDisc, emptySsd } from 'jsbeeb/fdc';
 

import { ClientCommand, ClientMessage, HostCommand, HostMessage } from '../types/shared/messages';

import { vscode } from './vscode';
import { Emulator, EmulatorCanvas } from './emulator';




const models = allModels;
let model: Model = findModel('MasterADFS');
const modelName = model.name; //'BBC Micro Model B';


function postMessage(message: ClientMessage) {
	vscode.postMessage(message);
}


export class EmulatorView {
	root: JQuery<HTMLElement>; // root element
	screen: JQuery<HTMLElement>; // screen element
	testcard: JQuery<HTMLElement>; // testcard element
	canvas: EmulatorCanvas;
	emuStatus: HTMLElement; // = document.getElementById('emu_status');
	showCoords: boolean;
	emulator: Emulator | undefined;

	constructor() {
		console.log('Emulator constructor');
		const root = $('#emulator'); // document.getElementById('emulator');		
		this.root = root;
		const screen = this.root.find('.screen');
		if (!screen) {
			throw new Error('No screen element found');
		}
		this.testcard = $('#testcard');
		this.testcard.hide();
		this.screen = screen;
		//this.screen = document.getElementById('screen');
		//		const screen = document.getElementById('screen'); // this.root.find('.screen');
		this.canvas = bestCanvas(screen[0]);
		const emuStatus = document.getElementById('emu_status'); 
		if (!emuStatus) {
			throw new Error('No emu_status element found');
		}
		this.emuStatus = emuStatus;		
		this.showCoords = false; // coordinate display mode

		// coords handlers
		screen.mousemove((event: any) => this.mouseMove(event));
		screen.mouseleave(() => this.mouseLeave());

		// forward key events to emulator
		screen.keyup((event:any) => this.emulator?.keyUp(event));
		screen.keydown((event:any) => this.emulator?.keyDown(event));
		screen.blur(() => this.emulator?.clearKeys());

		setInterval(this.timer.bind(this), 1000);		
	}

	async boot() {

		try {
			this.showTestCard(false);

			// any previously running emulator must be paused
			// before tear down, otherwise it will continue to paint itself
			if (this.emulator) {
				this.emulator.pause();
			}

			this.emulator = new Emulator(this.canvas, model);
			window.theEmulator = this.emulator;
			await this.emulator.initialise();
			postMessage({ command: ClientCommand.EmulatorReady });

			const discUrl = window.JSBEEB_DISC;
			if (discUrl) {
				const fdc = this.emulator.cpu.fdc;
				const discData = await utils.defaultLoadData(discUrl);
				const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
				this.emulator.cpu.fdc.loadDisc(0, discImage);
			}
			this.emulator.start();

		} catch(e: any) {
			this.showTestCard(true);
			postMessage({ command: ClientCommand.Error, text: e.message });
		}

	}

	showTestCard(show: boolean = true) {
		if (show) {
			this.screen.hide();
			this.testcard.show();
		}else {
			this.screen.show();
			this.testcard.hide();
		}
	}
	private timer() {

		if (this.emulator && !this.showCoords) {
			this.emuStatus.innerHTML = `${modelName} | ${Math.floor(this.emulator.cpu.currentCycles/2000000)} s`;
		}
	}


	private mouseLeave() {
		this.showCoords = false;
		this.timer();
	}

	private mouseMove(event: any) {
		if (!this.emulator) return;
		this.showCoords = true;
		const processor = this.emulator.cpu;
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

}



// async function bootEmulator() {

// 	const root = $('#emulator'); // document.getElementById('emulator');
// 	const emulator = new Emulator(root);
// 	window.theEmulator = emulator;
// 	await emulator.initialise();

// 	const discUrl = window.JSBEEB_DISC;
// 	if (discUrl) {
// 		const fdc = emulator.cpu.fdc;
// 		const discData = await utils.defaultLoadData(discUrl);
// 		const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
// 		emulator.cpu.fdc.loadDisc(0, discImage);
// 	}
// 	emulator.start();

// }

async function initialise() {

	const emulatorView = new EmulatorView();
	await emulatorView.boot();

	const $dropdown = $('#model-selector');
	$.each(models, function() {
		const name = this.name;
		const selected = name === modelName ? 'selected' : '';
		$dropdown.append($(`<vscode-option ${selected} />`).val(name).text(name));
	});
	$('#model-selector').change(function () { 
		const value = $(this).val() as string;
		console.log(value);
		const target = findModel(value);
		if (target === null) {
			postMessage({ command: ClientCommand.Error, text: `Failed to select model '${value}'`});
			emulatorView.showTestCard(true);
			return;
		}
		model = target;
		console.log(JSON.stringify(model));
		emulatorView.boot();
	});	



}

async function loadDisc(discUrl: string) {
	const emulator = window.theEmulator;
	
	if (!emulator || !emulator.ready) {
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
