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

export interface ClientMessageBase extends MessageBase {
  command: ClientCommand
}

export interface ClientMessageEmulatorReady extends ClientMessageBase {
  command: ClientCommand.EmulatorReady
}

export interface ClientMessagePageLoaded extends ClientMessageBase {
  command: ClientCommand.PageLoaded
}

export interface ClientMessageError extends ClientMessageBase {
  command: ClientCommand.Error
  text: string
}

export type ClientMessage =
  | ClientMessageEmulatorReady
  | ClientMessagePageLoaded
  | ClientMessageError

/**
 * Messages from host to client
 */

export type DiscImageFile = {
  url: string
  name: string
}

export const NO_DISC: DiscImageFile = { url: '', name: '-- no disc --' }

export const enum HostCommand {
  LoadDisc = 'loadDisc',
  ViewFocus = 'viewFocus',
  DiscImages = 'discImages',
  DiscImageChanges = 'discImageChanges',
}

export interface HostMessageBase extends MessageBase {
  command: HostCommand
}

export interface HostMessageDiscImages extends HostMessageBase {
  command: HostCommand.DiscImages
  discImages: DiscImageFile[]
}

export interface HostMessageDiscImageChanges extends HostMessageBase {
  command: HostCommand.DiscImageChanges
  discImageChanges: {
    changed?: DiscImageFile[]
    created?: DiscImageFile[]
    deleted?: DiscImageFile[]
  }
}

export interface HostMessageLoadDisc extends HostMessageBase {
  command: HostCommand.LoadDisc
  url: DiscImageFile
}

export interface HostMessageViewFocus extends HostMessageBase {
  command: HostCommand.ViewFocus
  focus: {
    active: boolean
    visible: boolean
  }
}

export type HostMessage =
  | HostMessageDiscImages
  | HostMessageDiscImageChanges
  | HostMessageLoadDisc
  | HostMessageViewFocus
