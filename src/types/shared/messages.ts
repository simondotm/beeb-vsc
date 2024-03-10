export interface MessageBase {
  command: string
}

/**
 * Messages from client to host
 */
export const enum ClientCommand {
  EmulatorReady = 'emulatorReady',
  PageLoaded = 'pageLoaded',
  Info = 'info',
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

export interface ClientMessageInfo extends ClientMessageBase {
  command: ClientCommand.Info
  text: string
}
export interface ClientMessageError extends ClientMessageBase {
  command: ClientCommand.Error
  text: string
}

export type ClientMessage =
  | ClientMessageEmulatorReady
  | ClientMessagePageLoaded
  | ClientMessageInfo
  | ClientMessageError

/**
 * Messages from host to client
 */

export type DiscImageFile = {
  url: string
  name: string
}

export type DiscImageOptions = {
  shouldReset?: boolean
  shouldAutoBoot?: boolean
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
  changed?: DiscImageFile[]
  created?: DiscImageFile[]
  deleted?: DiscImageFile[]
}

export interface HostMessageLoadDisc extends HostMessageBase {
  command: HostCommand.LoadDisc
  discImageFile: DiscImageFile
  discImageOptions?: DiscImageOptions
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
