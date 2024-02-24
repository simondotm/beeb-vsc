import { join } from 'path';
import { ExtensionContext, Uri, ViewColumn, Webview, commands, window } from 'vscode';


/**
 * Generate Uri for a file local to the extension workspace
 * @param context 
 * @param path 
 * @returns Uri
 */
export function localUri(context: ExtensionContext, path: string[]) {
	return Uri.file(join(context.extensionPath, ...path));
}

/**
 * Generate Uri/Url to a file local to the extension workspace for use in the webview
 * @param context 
 * @param webview 
 * @param path 
 * @returns 
 */
export function webviewUri(context: ExtensionContext, webview: Webview, path: string[]) {
	return webview.asWebviewUri(localUri(context, path));
}

/**
 * Generate a Uri for a `dist/webview/...' script asset
 * @param context 
 * @param assets 
 * @returns 
 */
export function scriptUri(context: ExtensionContext, assets: string[]) {
	return localUri(context, ['dist', 'webview', ...assets]);
}

/**
 * Generate a Uri/Url for a `dist/webview/...' script asset for use in the webview
 * @param context 
 * @param webview 
 * @param folders 
 * @returns 
 */
export function scriptUrl(context: ExtensionContext, webview: Webview, folders: string[]) {
	return webview.asWebviewUri(scriptUri(context, folders));
}


export function getJsBeebResources(context: ExtensionContext, webview: Webview) {
	function getResources(filenames: string[]) {
		const resources: Record<string, string> = {};
		for (const filename of filenames) {
			resources[filename] = scriptUrl(context, webview, ['jsbeeb', ...filename.split('/')]).toString();	
		}
		return resources;
	}	

	return getResources([
		'roms/a01/BASIC1.ROM',
		'roms/b/DFS-0.9.rom',
		'roms/b/DFS-1.2.rom',
		'roms/b1770/dfs1770.rom',
		'roms/b1770/zADFS.ROM',
		'roms/bp/dfs.rom',
		'roms/bp/zADFS.ROM',
		'roms/compact/adfs210.rom',
		'roms/compact/basic48.rom',
		'roms/compact/basic486.rom',
		'roms/compact/os51.rom',
		'roms/compact/utils.rom',
		'roms/master/anfs-4.25.rom',
		'roms/master/mos3.20',
		'roms/tube/6502Tube.rom',
		'roms/tube/ARMeval_100.rom',
		'roms/tube/BIOS.ROM',
		'roms/tube/ReCo6502ROM_816',
		'roms/tube/Z80_120.rom',
		'roms/us/USBASIC.rom',
		'roms/us/USDNFS.rom',
		'roms/ADFS1-53.rom',
		'roms/ample.rom',
		'roms/ats-3.0.rom',
		'roms/BASIC.ROM',
		'roms/bpos.rom',
		'roms/deos.rom',
		'roms/os.rom',
		'roms/os01.rom',
		'roms/usmos.rom',
		'sounds/disc525/motoron.wav',
		'sounds/disc525/motoroff.wav',
		'sounds/disc525/motor.wav',
		'sounds/disc525/step.wav',
		'sounds/disc525/seek.wav',
		'sounds/disc525/seek2.wav',
		'sounds/disc525/seek3.wav',
		'discs/elite.ssd',
	]);	
}
