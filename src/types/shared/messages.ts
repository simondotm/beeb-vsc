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
  Stopped = 'stopped',
  EmulatorInfo = 'emulatorInfo',
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

export interface ClientMessageStopped extends ClientMessageBase {
  command: ClientCommand.Stopped
  reason: string // TODO _ make this an enum
}

export interface ClientMessageEmulatorInfo extends ClientMessageBase {
  command: ClientCommand.EmulatorInfo
  info: {
    id: number
    type: string
    values: Array<{ name: string; value: string | number }>
  }
}

export type ClientMessage =
  | ClientMessageEmulatorReady
  | ClientMessagePageLoaded
  | ClientMessageInfo
  | ClientMessageError
  | ClientMessageStopped
  | ClientMessageEmulatorInfo

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

export const enum DebugInstructionType {
  SetBreakpoint = 'setbreakpoint',
  Step = 'step',
  Continue = 'continue',
  Pause = 'pause',
  ClearBreakpoint = 'clearbreakpoint',
  // TODO - expand to include other debug commands
}

export type DebugInstruction = {
  address?: number
  instruction: DebugInstructionType
}

export const NO_DISC: DiscImageFile = { url: '', name: '-- no disc --' }

export const enum HostCommand {
  LoadDisc = 'loadDisc',
  ViewFocus = 'viewFocus',
  DiscImages = 'discImages',
  DiscImageChanges = 'discImageChanges',
  DebugCommand = 'debugCommand',
  DebugRequest = 'debugRequest',
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

export interface HostMessageDebugCommand extends HostMessageBase {
  command: HostCommand.DebugCommand
  instruction: DebugInstruction
}

export interface HostMessageDebugRequest extends HostMessageBase {
  command: HostCommand.DebugRequest
  id: number
  request: string
}

export type HostMessage =
  | HostMessageDiscImages
  | HostMessageDiscImageChanges
  | HostMessageLoadDisc
  | HostMessageViewFocus
  | HostMessageDebugCommand
  | HostMessageDebugRequest
