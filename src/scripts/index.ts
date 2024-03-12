// This script is loaded by the WebView
import { Model, findModel } from 'jsbeeb/models'
import {
  ClientCommand,
  HostCommand,
  HostMessage,
} from '../types/shared/messages'

import { initialiseVSCode, notifyHost } from './vscode'
import { EmulatorView } from './emulator-view'
import { EmulatorInfoBar } from './emulator-infobar'
import { EmulatorToolBar } from './emulator-toolbar'
import { EmulatorLedBar } from './emulator-ledbar'

const defaultModel: Model = findModel('MasterADFS')

let emulatorView: EmulatorView
let emulatorInfoBar: EmulatorInfoBar | undefined
let emulatorToolBar: EmulatorToolBar | undefined
let emulatorLedBar: EmulatorLedBar | undefined

async function initialise() {
  initialiseVSCode()

  // create the emulator view container
  emulatorView = new EmulatorView()
  await emulatorView.initialise()

  // boot the emulator
  await emulatorView.boot(defaultModel)

  // create the info bar and toolbar UI
  emulatorInfoBar = new EmulatorInfoBar(emulatorView)
  emulatorToolBar = new EmulatorToolBar(emulatorView)
  emulatorLedBar = new EmulatorLedBar(emulatorView)

  // signal to host that emulator webview is ready
  // it might send us a disc image to mount if we started the
  // webview with a file context
  notifyHost({ command: ClientCommand.EmulatorReady })
}

// Handle the message inside the webview
window.addEventListener('load', (_event) => {
  console.log('BeebVSC: Emulator window loaded')
  notifyHost({ command: ClientCommand.PageLoaded })
})

// Set up event handler to produce text for the window focus event
window.addEventListener(
  'focus',
  (_event) => {
    emulatorView.focusInput()
  },
  false,
)

// Handle messages received from the host extensiond
window.addEventListener('message', (event) => {
  const message = event.data as HostMessage // The JSON data our extension sent
  switch (message.command) {
    case HostCommand.LoadDisc:
      // user has invoked a dsd/ssd file context menu for the emulator
      emulatorView.mountDisc(message.discImageFile, message.discImageOptions)
      emulatorView.focusInput()
      break
    case HostCommand.ViewFocus:
      // Emulator panel has changed active or visible state
      // We handle focus via window events at the moment
      // since these can arrive before the webview is ready
      // but we may want to do something with visibility or active state later
      break
    case HostCommand.DiscImages:
      emulatorView.setDiscImages(message.discImages)
      break
    case HostCommand.DiscImageChanges:
      //TODO: Listener logic here, in case we need to do something with modified disc images
      break
  }
})

initialise().then(() => {
  // And we're ready to go here.
})
