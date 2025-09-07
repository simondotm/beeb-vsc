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
  EmulatorMemory = 'emulatorMemory',
}

export const enum StoppedReason {
  Entry = 'entry',
  Breakpoint = 'breakpoint',
  Step = 'step',
  Pause = 'pause',
  Error = 'error',
  DataBreakpoint = 'dataBreakpoint',
  InstructionBreakpoint = 'instructionBreakpoint',
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
  reason: StoppedReason
}

export interface ClientMessageEmulatorInfo extends ClientMessageBase {
  command: ClientCommand.EmulatorInfo
  info: {
    id: number
    type: string
    values: Array<{ name: string; value: string | number }>
  }
}

export interface ClientMessageEmulatorMemory extends ClientMessageBase {
  command: ClientCommand.EmulatorMemory
  info: {
    id: number
    values: Uint8Array
  }
}

export type ClientMessage =
  | ClientMessageEmulatorReady
  | ClientMessagePageLoaded
  | ClientMessageInfo
  | ClientMessageError
  | ClientMessageStopped
  | ClientMessageEmulatorInfo
  | ClientMessageEmulatorMemory

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
  StepOver = 'stepover',
  StepOut = 'stepout',
  SetDataBreakpoint = 'setdatabreakpoint',
  ClearDataBreakpoint = 'cleardatabreakpoint',
  // TODO - expand to include other debug commands
}

export type DebugInstruction = {
  address?: number
  instruction: DebugInstructionType
}

export type DataBreakpointConfig = {
  id: string
  address: number
  accessType: 'read' | 'write' | 'readWrite'
  size: number // 1 for byte, 2 for word
}

export const NO_DISC: DiscImageFile = { url: '', name: '-- no disc --' }

export const enum HostCommand {
  LoadDisc = 'loadDisc',
  ViewFocus = 'viewFocus',
  DiscImages = 'discImages',
  DiscImageChanges = 'discImageChanges',
  DebugCommand = 'debugCommand',
  DebugRequest = 'debugRequest',
  SetBreakpoints = 'setBreakpoints',
  SetDataBreakpoints = 'setDataBreakpoints',
  SetDebugMode = 'setDebugMode',
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

export interface HostMessageSetBreakpoints extends HostMessageBase {
  command: HostCommand.SetBreakpoints
  breakpoints: number[]
}

export interface HostMessageSetDataBreakpoints extends HostMessageBase {
  command: HostCommand.SetDataBreakpoints
  dataBreakpoints: DataBreakpointConfig[]
}

export interface HostMessageSetDebugMode extends HostMessageBase {
  command: HostCommand.SetDebugMode
}

export type HostMessage =
  | HostMessageDiscImages
  | HostMessageDiscImageChanges
  | HostMessageLoadDisc
  | HostMessageViewFocus
  | HostMessageDebugCommand
  | HostMessageDebugRequest
  | HostMessageSetBreakpoints
  | HostMessageSetDataBreakpoints
  | HostMessageSetDebugMode
