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
  InitializedEvent,
  LoggingDebugSession,
  Scope,
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
} from '../../types/shared/messages'
import { Subject } from 'await-notify'

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
      cwd: _folder?.uri.fsPath,
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
  Flag = 10001,
  Stack = 10002,
}

// export class JSBeebDebugSession implements DebugAdapter {
export class JSBeebDebugSession extends LoggingDebugSession {
  private _reportProgress: boolean = false
  private _useInvalidatedEvent: boolean = false
  private requestId: number = 0
  private pendingRequests: Map<number, (response: any) => void> = new Map()
  private webview = EmulatorPanel.instance?.GetWebview()
  private _configurationDone = new Subject()
  private cwd: string | undefined

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
        case 'stopOnEntry':
          this.sendEvent(new StoppedEvent('entry', THREAD_ID))
          break
        case 'stopOnPause':
          this.sendEvent(new StoppedEvent('pause', THREAD_ID))
          break
        case 'stopOnStep':
          this.sendEvent(new StoppedEvent('step', THREAD_ID))
          break
        case 'stopOnBreakpoint':
          this.sendEvent(new StoppedEvent('breakpoint', THREAD_ID))
          break
        case 'stopOnDataBreakpoint':
          this.sendEvent(new StoppedEvent('data breakpoint', THREAD_ID))
          break
        case 'stopOnInstructionBreakpoint':
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
    response.body.supportsDisassembleRequest = true
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: JSBeebLaunchRequestArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request?: DebugProtocol.Request | undefined,
  ): Promise<void> {
    console.log('launchRequest called')

    this.cwd = args.cwd
    // wait 1 second until configuration has finished (and configurationDoneRequest has been called)
    await this._configurationDone.wait(1000)
    // TODO - move launch of emulator to here and add attach option?
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
      response.body.scopes.push(new Scope('Flags', VARTYPE.Flag, false))
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
      if (args.variablesReference === VARTYPE.Register) {
        const registers = await this.getRegisters()
        variables.push(...registers)
      }
    }
    response.body = { variables: variables }
    this.sendResponse(response)
  }

  private async getRegisters(): Promise<Variable[]> {
    const message: HostMessageDebugRequest = {
      command: HostCommand.DebugRequest,
      id: 0, // Will be added in sendRequest
      request: 'registers',
    }
    const webviewResponse = (await this.getFromEmulator(
      message,
    )) as ClientMessageEmulatorInfo
    return this.formatRegisters(webviewResponse.info.values)
  }

  private formatRegisters(
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
        ) // TODO - include decimal and binary?
      } else if (name === 'P') {
        vars.push(new Variable(name, `${value}`))
      }
    }
    return vars
  }

  protected async stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments,
  ): Promise<void> {
    const levels = args.levels || 0
    const registers = await this.getRegisters()
    console.log(args)
    const startFrame = args.startFrame || 0
    if (args.threadId === THREAD_ID && startFrame === STACKFRAME) {
      const stackframe = new StackFrame(STACKFRAME, 'main')
      const filename = 'main'
      stackframe.source = {
        name: filename,
        path: this.cwd ?? '' + filename,
      }

      response.body = {
        stackFrames: [stackframe],
        totalFrames: 1,
      }
      this.sendResponse(response)
    }
    console.log(response)
  }
}
