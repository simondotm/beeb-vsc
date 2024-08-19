import { join } from 'path'
import { Uri, Webview } from 'vscode'

/**
 * Generate Uri for a file local to the extension workspace
 * @param extensionPath
 * @param path
 * @returns Uri
 */
export function localUri(extensionPath: string, path: string[]) {
  return Uri.file(join(extensionPath, ...path))
}

/**
 * Generate Uri/Url to a file local to the extension workspace for use in the webview
 * @param extensionPath
 * @param webview
 * @param path
 * @returns
 */
export function webviewUri(
  extensionPath: string,
  webview: Webview,
  path: string[],
) {
  return webview.asWebviewUri(localUri(extensionPath, path))
}

/**
 * Generate a Uri for a `dist/webview/...' script asset
 * @param extensionPath
 * @param assets
 * @returns
 */
export function scriptUri(extensionPath: string, assets: string[]) {
  return localUri(extensionPath, ['dist', 'webview', ...assets])
}

/**
 * Generate a Uri/Url for a `dist/webview/...' script asset for use in the webview
 * @param extensionPath
 * @param webview
 * @param folders
 * @returns
 */
export function scriptUrl(
  extensionPath: string,
  webview: Webview,
  folders: string[],
) {
  return webview.asWebviewUri(scriptUri(extensionPath, folders))
}

export function getJsBeebResources(extensionPath: string, webview: Webview) {
  function getResources(filenames: string[]) {
    const resources: Record<string, string> = {}
    for (const filename of filenames) {
      resources[filename] = scriptUrl(extensionPath, webview, [
        'jsbeeb',
        ...filename.split('/'),
      ]).toString()
    }
    return resources
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
  ])
}
