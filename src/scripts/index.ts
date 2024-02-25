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

  // boot the emulator
  await emulatorView.boot(defaultModel)

  // create the info bar and toolbar UI
  emulatorInfoBar = new EmulatorInfoBar(emulatorView)
  emulatorToolBar = new EmulatorToolBar(emulatorView)
}

// Handle the message inside the webview
window.addEventListener('load', (event) => {
  console.log('window loaded')
  console.log(JSON.stringify(event))
  notifyHost({ command: ClientCommand.PageLoaded })
})

// Handle messages received from the host extension
window.addEventListener('message', (event) => {
  const message = event.data as HostMessage // The JSON data our extension sent
  console.log('message received')
  console.log(JSON.stringify(message))

  switch (message.command) {
    case HostCommand.LoadDisc:
      if (message.url) {
        console.log(`loadDisc=${message.url}`)
        // window.theEmulator?.loadDisc(message.url)
        emulatorView?.emulator?.loadDisc(message.url)
      }
      break
  }
})

initialise().then(() => {
  // And we're ready to go here.
})
