export interface MessageBase {
  command: string
}

/**
 * Messages from client to host
 */
export const enum ClientCommand {
  EmulatorReady = 'emulatorReady',
  PageLoaded = 'pageLoaded',
  Error = 'error',
}

export interface ClientMessage extends MessageBase {
  command: ClientCommand
  text?: string
}

/**
 * Messages from host to client
 */

export type DiscImageUri = {
  uri: string
  name: string
}

export const enum HostCommand {
  LoadDisc = 'loadDisc',
  ViewFocus = 'viewFocus',
  DiscImages = 'discImages',
  DiscImageChanges = 'discImageChanges',
}

export interface HostMessage extends MessageBase {
  command: HostCommand
  url?: string
  focus?: {
    active: boolean
    visible: boolean
  }
  discImages?: DiscImageUri[]
  discImageChanges?: {
    changed?: DiscImageUri[]
    created?: DiscImageUri[]
    deleted?: DiscImageUri[]
  }
}
