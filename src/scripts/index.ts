// This script is loaded by the WebView

import $ from 'jquery'
import { Model, allModels, findModel } from 'jsbeeb/models'
import {
  ClientCommand,
  HostCommand,
  HostMessage,
} from '../types/shared/messages'

import { initialiseVSCode, notifyHost } from './vscode'
import { EmulatorView } from './emulator-view'

let model: Model = findModel('MasterADFS')

async function initialise() {
  initialiseVSCode()

  // create the emulator view
  const emulatorView = new EmulatorView()
  await emulatorView.boot(model)

  // this is all webview ui & message handling
  const $dropdown = $('#model-selector')
  $.each(allModels, function () {
    const name = this.name
    const selected = name === model.name ? 'selected' : ''
    $dropdown.append($(`<vscode-option ${selected} />`).val(name).text(name))
  })
  $('#model-selector').change(function () {
    const value = $(this).val() as string
    console.log(value)
    const target = findModel(value)
    if (target === null) {
      notifyHost({
        command: ClientCommand.Error,
        text: `Failed to select model '${value}'`,
      })
      emulatorView.showTestCard(true)
      return
    }
    model = target
    console.log(JSON.stringify(model))
    emulatorView.boot(model)
  })
}

// Handle the message inside the webview
window.addEventListener('load', (event) => {
  console.log('window loaded')
  console.log(JSON.stringify(event))
  notifyHost({ command: ClientCommand.PageLoaded })
})
window.addEventListener('message', (event) => {
  const message = event.data as HostMessage // The JSON data our extension sent
  console.log('message received')
  console.log(JSON.stringify(message))

  switch (message.command) {
    case HostCommand.LoadDisc:
      if (message.url) {
        console.log(`loadDisc=${message.url}`)
        window.theEmulator?.loadDisc(message.url)
      }
      break
  }
})

initialise().then(() => {
  // And we're ready to go here.
})
