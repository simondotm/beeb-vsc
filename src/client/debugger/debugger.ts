// Wrapper for communicating with the jsbeeb instance in the webview
// Defines the debug session and the commands that can be sent to the debugger
import {
  DebugAdapterDescriptorFactory,
  DebugSession,
  ProviderResult,
  DebugAdapterDescriptor,
  DebugAdapterInlineImplementation,
  window,
  DebugConfigurationProvider,
  DebugConfiguration,
  WorkspaceFolder,
  CancellationToken,
} from 'vscode'
import {
  Breakpoint,
  InitializedEvent,
  LoggingDebugSession,
  Scope,
  Source,
  StackFrame,
  StoppedEvent,
  Thread,
  Variable,
} from '@vscode/debugadapter'
import { DebugProtocol } from '@vscode/debugprotocol'
import { EmulatorPanel } from '../panels/emulator-panel'
import {
  ClientCommand,
  ClientMessage,
  ClientMessageEmulatorInfo,
  DebugInstructionType,
  HostCommand,
  HostMessageDebugCommand,
  HostMessageDebugRequest,
  HostMessageSetBreakpoints,
  StoppedReason,
} from '../../types/shared/messages'
import { Subject } from 'await-notify'
import {
  SourceFileMap,
  SourceMap,
  SourceMapFile,
} from '../../types/shared/debugsource'
import { URItoVSCodeURI } from '../../server/filehandler'
import * as fs from 'fs'
import path from 'path'

export class InlineDebugAdapterFactory
  implements DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    _session: DebugSession,
  ): ProviderResult<DebugAdapterDescriptor> {
    return new DebugAdapterInlineImplementation(new JSBeebDebugSession())
  }
}

export class JSBeebConfigurationProvider implements DebugConfigurationProvider {
  resolveDebugConfiguration(
    _folder: WorkspaceFolder | undefined,
    _config: DebugConfiguration,
    _token?: CancellationToken,
  ): ProviderResult<DebugConfiguration> {
    return {
      type: 'jsbeebdebugger',
      name: 'Launch',
      request: 'launch',
      diskImage: '',
      stopOnEntry: true,
      enableLogging: false,
      cwd: _folder?.uri.fsPath ?? _config.cwd,
    }
  }
}

interface JSBeebLaunchRequestArguments
  extends DebugProtocol.LaunchRequestArguments {
  diskImage: string
  stopOnEntry?: boolean
  enableLogging?: boolean
  cwd: string
}

// No need for multiple threads, so we can use a hardcoded ID for the default thread
const THREAD_ID = 1
const STACKFRAME = 0
const enum VARTYPE {
  Register = 10000,
  StatusRegister = 10001,
  System = 10002,
}

const flagsNames = [
  'Negative',
  'Overflow',
  'Unused',
  'Break',
  'Decimal',
  'Interrupt disable',
  'Zero',
  'Carry',
]

// export class JSBeebDebugSession implements DebugAdapter {
export class JSBeebDebugSession extends LoggingDebugSession {
  private _reportProgress: boolean = false
  private _useInvalidatedEvent: boolean = false
  private requestId: number = 0
  private pendingRequests: Map<number, (response: unknown) => void> = new Map()
  private webview = EmulatorPanel.instance?.GetWebview()
  private _configurationDone = new Subject()
  private cwd: string = ''
  private addressesMap: SourceMap[] = new Array(0x10000)
  private sourceFileMap: SourceFileMap = {}
  private fileLineToAddressMap: Map<number, Map<number, number>> = new Map()
  private currentPC: number = -1

  public constructor() {
    super()
    console.log('JSBeebDebugSession constructor called')
    // The runtime is the jsbeeb instance in the webview, we tell it to start, step, stop, etc.
    if (this.webview) {
      this.webview.onDidReceiveMessage(this.handleMessageFromWebview.bind(this))
    }
  }

  private handleMessageFromWebview(message: object) {
    if (message === null || !('command' in message)) {
      return
    }
    if (message.command === ClientCommand.EmulatorInfo) {
      this.handleEmulatorResponse(message as ClientMessageEmulatorInfo)
    } else {
      this.handleEmulatorMessage(message as ClientMessage)
    }
  }

  // Standalone messages from the emulator to the debug adapter
  private handleEmulatorMessage(message: ClientMessage) {
    if (message.command === ClientCommand.Stopped) {
      switch (message.reason) {
        case StoppedReason.Entry:
          this.sendEvent(new StoppedEvent('entry', THREAD_ID))
          break
        case StoppedReason.Pause:
          this.sendEvent(new StoppedEvent('pause', THREAD_ID))
          break
        case StoppedReason.Step:
          this.sendEvent(new StoppedEvent('step', THREAD_ID))
          break
        case StoppedReason.Breakpoint:
          this.sendEvent(new StoppedEvent('breakpoint', THREAD_ID))
          break
        case StoppedReason.DataBreakpoint:
          this.sendEvent(new StoppedEvent('data breakpoint', THREAD_ID))
          break
        case StoppedReason.InstructionBreakpoint:
          this.sendEvent(new StoppedEvent('instruction breakpoint', THREAD_ID))
          break
      }
    } else if (message.command === ClientCommand.EmulatorInfo) {
      window.showInformationMessage(
        'EmulatorInfo event received' + message.info,
      )
    }
  }

  // Responses from the emulator to requests from this debug adapter
  private handleEmulatorResponse(response: ClientMessageEmulatorInfo) {
    const id = response.info.id
    if (this.pendingRequests.has(id)) {
      const resolve = this.pendingRequests.get(id)
      if (resolve) {
        resolve(response)
        this.pendingRequests.delete(id)
      }
    }
  }

  private getFromEmulator(request: HostMessageDebugRequest): Promise<unknown> {
    request.id = this.requestId++
    return new Promise((resolve) => {
      this.pendingRequests.set(request.id, resolve)
      if (this.webview) {
        this.webview.postMessage(request)
      }
    })
  }

  /**
   * The 'initialize' request is the first request called by the frontend
   * to interrogate the features the debug adapter provides.
   */
  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments,
  ): void {
    if (args.supportsProgressReporting) {
      this._reportProgress = true
    }
    if (args.supportsInvalidatedEvent) {
      this._useInvalidatedEvent = true
    }

    // build and return the capabilities of this debug adapter:
    response.body = response.body || {}

    // the adapter implements the configurationDone request.
    response.body.supportsConfigurationDoneRequest = true

    // make VS Code use 'evaluate' when hovering over source
    response.body.supportsEvaluateForHovers = false

    // make VS Code show a 'step back' button
    response.body.supportsStepBack = false

    // make VS Code support data breakpoints
    response.body.supportsDataBreakpoints = true

    // make VS Code support completion in REPL
    response.body.supportsCompletionsRequest = false
    response.body.completionTriggerCharacters = ['.', '[']

    // make VS Code send cancel request
    response.body.supportsCancelRequest = false

    // make VS Code send the breakpointLocations request
    response.body.supportsBreakpointLocationsRequest = true

    // make VS Code provide "Step in Target" functionality
    response.body.supportsStepInTargetsRequest = false

    // the adapter defines two exceptions filters, one with support for conditions.
    response.body.supportsExceptionFilterOptions = false
    response.body.exceptionBreakpointFilters = []

    // make VS Code send exceptionInfo request
    response.body.supportsExceptionInfoRequest = false

    // make VS Code send setVariable request
    response.body.supportsSetVariable = false

    // make VS Code send setExpression request
    response.body.supportsSetExpression = false

    // make VS Code send disassemble request
    response.body.supportsDisassembleRequest = false // Do we want this? We're starting with assembly but useful for self-modifying code?
    response.body.supportsSteppingGranularity = false
    response.body.supportsInstructionBreakpoints = true

    // make VS Code able to read and write variable memory
    response.body.supportsReadMemoryRequest = true
    response.body.supportsWriteMemoryRequest = false

    response.body.supportSuspendDebuggee = false
    response.body.supportTerminateDebuggee = false
    response.body.supportsFunctionBreakpoints = false
    response.body.supportsDelayedStackTraceLoading = false

    this.sendResponse(response)

    // since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
    // we request them early by sending an 'initializeRequest' to the frontend.
    // The frontend will end the configuration sequence by calling 'configurationDone' request.
    this.sendEvent(new InitializedEvent())
  }

  protected configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    args: DebugProtocol.ConfigurationDoneArguments,
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('configurationDoneRequest called')
    super.configurationDoneRequest(response, args, request)
    // notify the launchRequest that configuration has finished
    this._configurationDone.notify()
  }

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: JSBeebLaunchRequestArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): Promise<void> {
    console.log('launchRequest called')

    this.cwd = args.cwd
    // load sourcemap
    this.loadSourceMap()

    // wait 1 second until configuration has finished (and configurationDoneRequest has been called)
    await this._configurationDone.wait(1000)
    // TODO - move launch of emulator to here and add attach option?
    this.sendResponse(response)
  }

  private loadSourceMap(): void {
    // TODO: Which file will be loaded?
    // Option 1) Use settings.json to specify the file(s), then load first or all (but beware of overlappping addresses)
    // Option 2) Load all .map files in the directory
    // Option 3) Load a specific file (or files), e.g. main.map, specified in launch.json

    // Option 3 is probably best (most standard) but can fall back to 1 or 2 if not specified
    let sourceMap: SourceMapFile
    try {
      const files = fs
        .readdirSync(this.cwd)
        .filter((file) => file.endsWith('.map'))
      if (files.length > 0) {
        const mapFile = fs.readFileSync(path.join(this.cwd, files[0]), 'utf8')
        sourceMap = JSON.parse(mapFile)
        // transfer data out of address structure
        for (const address in sourceMap.addresses) {
          const map = sourceMap.addresses[address]
          const addr = parseInt(address, 10)
          this.addressesMap[addr] = map
        }
        // transfer data out of sources structure, one by one
        for (const source in sourceMap.sources) {
          const id = parseInt(source, 10)
          this.sourceFileMap[id] = sourceMap.sources[source]
        }
        // Create map for each source file from line number to address
        // (first address of line, may support multiple addresses in future for multi-statement lines)
        for (const address in sourceMap.addresses) {
          const map = sourceMap.addresses[address]
          const source = map.file
          const lineMap = this.fileLineToAddressMap.get(source)
          if (lineMap) {
            const line = map.line
            // check not set yet
            if (!lineMap.has(line)) {
              lineMap.set(line, parseInt(address, 10))
            }
          } else {
            this.fileLineToAddressMap.set(
              source,
              new Map([[map.line, parseInt(address, 10)]]),
            )
          }
        }
      }
    } catch (error) {
      console.error('Error loading source map:', error)
      return
    }
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('setBreakPointsRequest called' + args.source.path)
    // Map breakpoint args to addresses
    if (args.source.path === undefined) {
      this.sendResponse(response)
      return
    }
    const sourceFile = URItoVSCodeURI(args.source.path)
    // Get the source file ID
    let sourceId = 0
    for (const id in this.sourceFileMap) {
      if (this.sourceFileMap[id] === sourceFile) {
        sourceId = parseInt(id, 10)
        break
      }
    }
    if (sourceId === 0) {
      // console.error('Source file not found in source map:', sourceFile)
      this.sendResponse(response)
      return
    }
    // Get addresses from lines using lineFile mapping
    const breakpoints = args.breakpoints || []
    const breakpointsResponse: Breakpoint[] = []
    const breakpointAddresses: number[] = []
    const lineMap = this.fileLineToAddressMap.get(sourceId)
    if (lineMap) {
      for (const breakpoint of breakpoints) {
        const line = breakpoint.line
        const address = lineMap.get(line)
        if (address) {
          breakpointAddresses.push(address)
          breakpointsResponse.push(new Breakpoint(true, line))
        }
      }
    }

    // TODO - maintain internal list of breakpoints set by file, so can clear old ones when new ones set for that file
    // Have to send list of changes because debugger takes 'toggle' approach to breakpoints
    // Send breakpoints to emulator
    const message: HostMessageSetBreakpoints = {
      command: HostCommand.SetBreakpoints,
      breakpoints: breakpointAddresses,
    }
    EmulatorPanel.instance?.notifyClient(message)

    // Return breakpoints to frontend
    response.body = { breakpoints: breakpointsResponse }
    this.sendResponse(response)
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    // runtime supports no threads so just return a default thread.
    response.body = {
      threads: [
        new Thread(THREAD_ID, 'thread 1'),
        // new Thread(this.THREAD_ID + 1, 'thread 2'),
      ],
    }
    this.sendResponse(response)
  }
  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: DebugProtocol.PauseArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('pauseRequest called')
    const message: HostMessageDebugCommand = {
      command: HostCommand.DebugCommand,
      instruction: { instruction: DebugInstructionType.Pause },
    }
    EmulatorPanel.instance?.notifyClient(message)
    this.sendResponse(response)
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: DebugProtocol.ContinueArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('continueRequest called')
    const message: HostMessageDebugCommand = {
      command: HostCommand.DebugCommand,
      instruction: { instruction: DebugInstructionType.Continue },
    }
    EmulatorPanel.instance?.notifyClient(message)
    // this.sendEvent(new ContinuedEvent(this.THREAD_ID)) // Not sure if needed
    this.sendResponse(response)
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: DebugProtocol.StepInArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('stepInRequest called')
    const message: HostMessageDebugCommand = {
      command: HostCommand.DebugCommand,
      instruction: { instruction: DebugInstructionType.Step },
    }
    EmulatorPanel.instance?.notifyClient(message)
    this.sendResponse(response)
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: DebugProtocol.NextArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('nextRequest called')
    const message: HostMessageDebugCommand = {
      command: HostCommand.DebugCommand,
      instruction: { instruction: DebugInstructionType.StepOver },
    }
    EmulatorPanel.instance?.notifyClient(message)
    this.sendResponse(response)
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: DebugProtocol.StepOutArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('stepOutRequest called')
    const message: HostMessageDebugCommand = {
      command: HostCommand.DebugCommand,
      instruction: { instruction: DebugInstructionType.StepOut },
    }
    EmulatorPanel.instance?.notifyClient(message)
    this.sendResponse(response)
  }

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments,
  ): void {
    response.body = { scopes: [] }
    console.log(args)
    if (args !== null && args.frameId === STACKFRAME) {
      response.body.scopes.push(new Scope('Registers', VARTYPE.Register, false))
      response.body.scopes[0].presentationHint = 'registers'
      response.body.scopes.push(
        new Scope('Status Register', VARTYPE.StatusRegister, false),
      )
      response.body.scopes.push(new Scope('System', VARTYPE.System, false))
      // TODO - symbols, stats, crtc, etc.?
    }
    console.log(response)
    this.sendResponse(response)
  }

  protected async variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): Promise<void> {
    console.log(args)
    const variables: Variable[] = []
    if (args.filter === undefined || args.filter === 'named') {
      const internals = await this.getInternals()
      if (args.variablesReference === VARTYPE.Register) {
        const registers = internals.filter((reg) =>
          ['PC', 'S', 'A', 'X', 'Y', 'P'].includes(reg.name),
        )
        variables.push(...registers)
      } else if (args.variablesReference === VARTYPE.StatusRegister) {
        const status = internals.filter((reg) => flagsNames.includes(reg.name))
        variables.push(...status)
      }
    }
    response.body = { variables: variables }
    this.sendResponse(response)
  }

  private async getInternals(): Promise<Variable[]> {
    const message: HostMessageDebugRequest = {
      command: HostCommand.DebugRequest,
      id: 0, // Will be added in sendRequest
      request: 'registers',
    }
    const webviewResponse = (await this.getFromEmulator(
      message,
    )) as ClientMessageEmulatorInfo
    return this.formatInternals(webviewResponse.info.values)
  }

  private formatInternals(
    registers: Array<{ name: string; value: string | number }>,
  ): Variable[] {
    const vars: Variable[] = []
    for (const { name, value } of registers) {
      if (['PC', 'S', 'A', 'X', 'Y'].includes(name)) {
        vars.push(
          new Variable(
            name,
            `$${value.toString(16).toUpperCase().padStart(2, '0')}`,
          ),
        ) // TODO - include decimal and binary formats?
      } else if (name === 'P') {
        vars.push(new Variable(name, `${value}`))
        // split status register string into individual flags
        const flags = value.toString().split('')
        for (let i = 0; i < flags.length; i++) {
          vars.push(
            new Variable(
              flagsNames[i],
              (flags[i] === flags[i].toUpperCase()).toString(),
            ),
          )
        }
      }
    }
    return vars
  }

  protected async stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments,
  ): Promise<void> {
    // const levels = args.levels || 0
    console.log(args)
    const startFrame = args.startFrame || 0
    // Get PC from emulator
    const registers = await this.getInternals()
    const pc = registers.find((reg) => reg.name === 'PC')
    if (args.threadId === THREAD_ID && startFrame === STACKFRAME && pc) {
      const pcAddress = parseInt(pc.value.replace('$', '').toString(), 16)
      const file = this.addressesMap[pcAddress]?.file ?? -1
      if (file === -1) {
        response.body = { stackFrames: [], totalFrames: 0 }
        this.sendResponse(response)
        return
      }
      const line = this.addressesMap[pcAddress]?.line ?? 0
      const filepath = this.sourceFileMap[file]
      const filename = path.basename(filepath)
      const source: Source = {
        name: path.basename(filepath),
        path: filepath,
        sourceReference: 0,
      }
      const stackframe = new StackFrame(STACKFRAME, filename, source, line, 0)
      // TODO - have generic default stack frame if the file is not found
      // TODO - build up stack frames using parent field of addresses

      response.body = {
        stackFrames: [stackframe],
        totalFrames: 1,
      }
      this.sendResponse(response)
    }
    console.log(response)
  }
}
