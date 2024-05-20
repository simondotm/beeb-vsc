// Wrapper for communicating with the jsbeeb instance in the webview
// Defines the debug session and the commands that can be sent to the debugger
import {
  DebugAdapterDescriptorFactory,
  DebugSession,
  ProviderResult,
  DebugAdapterDescriptor,
  DebugAdapterInlineImplementation,
  window,
} from 'vscode'
import {
  Handles,
  InitializedEvent,
  LoggingDebugSession,
  Scope,
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

export class InlineDebugAdapterFactory
  implements DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    _session: DebugSession,
  ): ProviderResult<DebugAdapterDescriptor> {
    return new DebugAdapterInlineImplementation(new JSBeebDebugSession())
  }
}

// export class JSBeebDebugSession implements DebugAdapter {
export class JSBeebDebugSession extends LoggingDebugSession {
  // No need for multiple threads, so we can use a hardcoded ID for the default thread
  private THREAD_ID = 1
  private _reportProgress: boolean = false
  private _useInvalidatedEvent: boolean = false
  private requestId: number = 0
  private pendingRequests: Map<number, (response: any) => void> = new Map()
  private webview = EmulatorPanel.instance?.GetWebview()
  private _variableHandles = new Handles<'locals' | 'globals'>() // | RuntimeVariable>()

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

  // Standalon messages from the emulator to the debug adapter
  private handleEmulatorMessage(message: ClientMessage) {
    if (message.command === ClientCommand.Stopped) {
      switch (message.reason) {
        case 'stopOnEntry':
          this.sendEvent(new StoppedEvent('entry', this.THREAD_ID))
          break
        case 'stopOnPause':
          this.sendEvent(new StoppedEvent('pause', this.THREAD_ID))
          break
        case 'stopOnStep':
          this.sendEvent(new StoppedEvent('step', this.THREAD_ID))
          break
        case 'stopOnBreakpoint':
          this.sendEvent(new StoppedEvent('breakpoint', this.THREAD_ID))
          break
        case 'stopOnDataBreakpoint':
          this.sendEvent(new StoppedEvent('data breakpoint', this.THREAD_ID))
          break
        case 'stopOnInstructionBreakpoint':
          this.sendEvent(
            new StoppedEvent('instruction breakpoint', this.THREAD_ID),
          )
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

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments,
  ): void {
    response.body = {
      scopes: [
        new Scope('Locals', this._variableHandles.create('locals'), false),
        new Scope('Globals', this._variableHandles.create('globals'), true),
      ],
    }
    this.sendResponse(response)
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
    response.body.supportsEvaluateForHovers = true

    // make VS Code show a 'step back' button
    response.body.supportsStepBack = false

    // make VS Code support data breakpoints
    response.body.supportsDataBreakpoints = true

    // make VS Code support completion in REPL
    response.body.supportsCompletionsRequest = true
    response.body.completionTriggerCharacters = ['.', '[']

    // make VS Code send cancel request
    response.body.supportsCancelRequest = true

    // make VS Code send the breakpointLocations request
    response.body.supportsBreakpointLocationsRequest = true

    // make VS Code provide "Step in Target" functionality
    response.body.supportsStepInTargetsRequest = true

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
    response.body.supportsSteppingGranularity = true
    response.body.supportsInstructionBreakpoints = true

    // make VS Code able to read and write variable memory
    response.body.supportsReadMemoryRequest = true
    response.body.supportsWriteMemoryRequest = false

    response.body.supportSuspendDebuggee = true
    response.body.supportTerminateDebuggee = true
    response.body.supportsFunctionBreakpoints = true
    response.body.supportsDelayedStackTraceLoading = true

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
  }

  protected launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: DebugProtocol.LaunchRequestArguments,
    request?: DebugProtocol.Request | undefined,
  ): void {
    console.log('launchRequest called')
    super.launchRequest(response, args, request)
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    // runtime supports no threads so just return a default thread.
    response.body = {
      threads: [
        new Thread(this.THREAD_ID, 'thread 1'),
        // new Thread(this.THREAD_ID + 1, 'thread 2'),
      ],
    }
    this.sendResponse(response)
  }
  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments,
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
    args: DebugProtocol.ContinueArguments,
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

  protected async variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments,
    request?: DebugProtocol.Request | undefined,
  ): Promise<void> {
    const v = this._variableHandles.get(args.variablesReference) // TODO - handle locals and globals and more???
    const vs: Variable[] = []
    // const message = {
    //   request: 'pc',
    // }
    const message: HostMessageDebugRequest = {
      command: HostCommand.DebugRequest,
      id: 0, // Will be added in sendRequest
      request: 'pc',
    }
    const webviewResponse = (await this.getFromEmulator(
      message,
    )) as ClientMessageEmulatorInfo
    //   command: ClientCommand.EmulatorInfo,
    //   info: { id: message.id, type: 'pc', value: pc },
    vs.push(new Variable('PC', '$' + webviewResponse.info.value.toString(16)))
    vs.push(new Variable('A', '0')) // TODO - get from emulator
    response.body = { variables: vs }
    this.sendResponse(response)
  }

  protected stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments,
  ): void {
    const stackframe = { id: 1, name: 'all', line: 0, column: 0 }
    response.body = {
      stackFrames: [stackframe],
      totalFrames: 1,
    }
    this.sendResponse(response)
  }
}
