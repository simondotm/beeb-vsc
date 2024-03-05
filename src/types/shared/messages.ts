export interface MessageBase {
  command: string
}

// Message from client to host
export const enum ClientCommand {
  EmulatorReady = 'emulatorReady',
  PageLoaded = 'pageLoaded',
  Error = 'error',
}

export interface ClientMessage extends MessageBase {
  command: ClientCommand
  text?: string
}

// Message from host to client
export const enum HostCommand {
  LoadDisc = 'loadDisc',
  ViewFocus = 'viewFocus',
}

export interface HostMessage extends MessageBase {
  command: HostCommand
  url?: string
  focus?: {
    active: boolean
    visible: boolean
  }
}
