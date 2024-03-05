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

const defaultModel: Model = findModel('MasterADFS')

let emulatorView: EmulatorView
let emulatorInfoBar: EmulatorInfoBar | undefined
let emulatorToolBar: EmulatorToolBar | undefined

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

  // signal to host that emulator webview is ready
  // it might send us a disc image to mount if we started the
  // webview with a file context
  notifyHost({ command: ClientCommand.EmulatorReady })
}

// Handle the message inside the webview
window.addEventListener('load', (event) => {
  console.log('window loaded')
  console.log(JSON.stringify(event))
  notifyHost({ command: ClientCommand.PageLoaded })
})

// Set up event handler to produce text for the window focus event
window.addEventListener(
  'focus',
  (_event) => {
    console.log('window focused')
    emulatorView.focusInput()
  },
  false,
)

// Handle messages received from the host extensiond
window.addEventListener('message', (event) => {
  const message = event.data as HostMessage // The JSON data our extension sent
  console.log('message received')
  console.log(JSON.stringify(message))

  switch (message.command) {
    case HostCommand.LoadDisc:
      if (message.url) {
        emulatorView.mountDisc(message.url, true)
      }
      break
    case HostCommand.ViewFocus:
      // if (message.isViewFocused) {
      //   emulatorView.focus()
      // }
      break
  }
})

initialise().then(() => {
  // And we're ready to go here.
})
