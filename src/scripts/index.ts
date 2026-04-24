// This script is loaded by the WebView
import {
  initialiseWebViewTelemetry,
  sendTelemetryEvent,
  sendTelemetryException,
} from './webview-telemetry'
initialiseWebViewTelemetry()

import { Model, findModel } from 'jsbeeb/models'
import {
  ClientCommand,
  DebugInstructionType,
  HostCommand,
  HostMessage,
  StoppedReason,
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
let debugMode: boolean = false

function withEmulatorView(callback: (emulatorView: EmulatorView) => void) {
  if (!emulatorView) {
    return
  }

  callback(emulatorView)
}

async function initialise() {
  sendTelemetryEvent('emulatorActivated')

  try {
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
  } catch (error) {
    console.error('BeebVSC: Error initialising emulator', error)
    notifyHost({
      command: ClientCommand.Error,
      text: `Error initialising emulator: ${(error as any).message}`,
    })
    sendTelemetryException(error as Error)
  }
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
    withEmulatorView((view) => view.focusInput())
  },
  false,
)

window.addEventListener(
  'keydown',
  (event) => {
    if (debugMode && event.altKey && event.key === 'PageDown') {
      event.preventDefault()
      event.stopPropagation()
      withEmulatorView((view) => view.openRewind())
    }
  },
  true,
)

// Handle messages received from the host extension
window.addEventListener('message', (event) => {
  const message = event.data as HostMessage // The JSON data our extension sent
  if (!emulatorView && message.command !== HostCommand.SetDebugMode) {
    return
  }

  switch (message.command) {
    case HostCommand.LoadDisc:
      // user has invoked a dsd/ssd file context menu for the emulator
      withEmulatorView((view) => {
        view.mountDisc(message.discImageFile, message.discImageOptions)
        view.focusInput()
      })
      break
    case HostCommand.ViewFocus:
      // Emulator panel has changed active or visible state
      // We handle focus via window events at the moment
      // since these can arrive before the webview is ready
      // but we may want to do something with visibility or active state later
      if (!debugMode) {
        withEmulatorView((view) => {
          if (message.focus.visible) {
            view.resume()
          } else {
            view.suspend()
          }
        })
      }
      break
    case HostCommand.DiscImages:
      withEmulatorView((view) => view.setDiscImages(message.discImages))
      break
    case HostCommand.DiscImageChanges:
      //TODO: Listener logic here, in case we need to do something with modified disc images
      break
    case HostCommand.DebugCommand: {
      const instructiontype = message.instruction.instruction
      if (instructiontype === DebugInstructionType.Pause) {
        withEmulatorView((view) => view.suspend())
        notifyHost({
          command: ClientCommand.Stopped,
          reason: StoppedReason.Pause,
        })
      } else if (instructiontype === DebugInstructionType.Continue) {
        withEmulatorView((view) => view.resume())
      } else if (instructiontype === DebugInstructionType.Step) {
        withEmulatorView((view) => view.step())
        notifyHost({
          command: ClientCommand.Stopped,
          reason: StoppedReason.Step,
        })
      } else if (instructiontype === DebugInstructionType.StepOver) {
        withEmulatorView((view) => view.stepOver())
        notifyHost({
          command: ClientCommand.Stopped,
          reason: StoppedReason.Step,
        })
      } else if (instructiontype === DebugInstructionType.StepOut) {
        withEmulatorView((view) => view.stepOut())
        notifyHost({
          command: ClientCommand.Stopped,
          reason: StoppedReason.Step,
        })
      }
      break
    }
    case HostCommand.DebugRequest: {
      if (message.request === 'registers') {
        withEmulatorView((view) => {
          const registers = view.GetInternals()
          notifyHost({
            command: ClientCommand.EmulatorInfo,
            info: {
              id: message.id,
              type: 'registers',
              values: registers,
            },
          })
        })
      } else if (message.request === 'memory') {
        withEmulatorView((view) => {
          const memory = view.GetMemory()
          notifyHost({
            command: ClientCommand.EmulatorMemory,
            info: {
              id: message.id,
              values: memory,
            },
          })
        })
      }
      break
    }
    case HostCommand.SetBreakpoints: {
      if (message.breakpoints) {
        withEmulatorView((view) => view.SetBreakpoints(message.breakpoints))
      }
      break
    }
    case HostCommand.SetDataBreakpoints: {
      if (message.dataBreakpoints) {
        withEmulatorView((view) =>
          view.SetDataBreakpoints(message.dataBreakpoints),
        )
      }
      break
    }
    case HostCommand.SetDebugMode: {
      debugMode = message.enabled
      withEmulatorView((view) => view.setDebugMode(debugMode))
      if (!debugMode) {
        withEmulatorView((view) => {
          if (document.visibilityState === 'visible') {
            view.resume()
          } else {
            view.suspend()
          }
        })
      }
      break
    }
  }
})

initialise().then(() => {
  // And we're ready to go here.
})
