import $ from 'jquery'
import { bestCanvas } from 'jsbeeb/canvas'
import { Emulator, EmulatorCanvas } from './emulator'
import { Model } from 'jsbeeb/models'
import { CustomAudioHandler } from './custom-audio-handler'
import {
  BehaviorSubject,
  Observable,
  Subject,
  distinctUntilChanged,
} from 'rxjs'
import { DisplayMode, getDisplayModeInfo } from './display-modes'
import { notifyHost } from './vscode'
import {
  ClientCommand,
  DiscImageFile,
  DiscImageOptions,
  NO_DISC,
} from '../types/shared/messages'

const audioFilterFreq = 7000
const audioFilterQ = 5
const noSeek = false

export class EmulatorView {
  readonly root: JQuery<HTMLElement> // root element
  readonly screen: JQuery<HTMLElement> // screen element
  readonly testcard: JQuery<HTMLElement> // testcard element
  readonly canvas: EmulatorCanvas
  readonly audioHandler: CustomAudioHandler

  model: Model | undefined
  emulator: Emulator | undefined // Dont hold references to the emulator, it may be paused and destroyed

  private suspended: boolean = false

  // shared emulator update observable
  private _emulatorUpdate$ = new Subject<Emulator>()
  emulatorUpdate$: Observable<Emulator> = this._emulatorUpdate$

  // shared emulator state observable
  private _emulatorRunning$ = new BehaviorSubject<boolean>(false)
  emulatorRunning$ = this._emulatorRunning$.pipe(distinctUntilChanged())
  get emulatorRunning(): boolean {
    return this._emulatorRunning$.value
  }

  // currently selected disc image
  private _discImageFile$ = new BehaviorSubject<DiscImageFile>(NO_DISC)
  discImageFile$: Observable<DiscImageFile> = this._discImageFile$
  get discImageFile(): DiscImageFile {
    return this._discImageFile$.value
  }

  // disc images in the current workspace
  private _discImages$ = new BehaviorSubject<DiscImageFile[]>([])
  discImages$: Observable<DiscImageFile[]> = this._discImages$
  setDiscImages(discImages: DiscImageFile[]) {
    this._discImages$.next(discImages)
  }

  // observables
  private _displayMode$ = new BehaviorSubject<DisplayMode>(null)
  readonly displayMode$: Observable<DisplayMode> = this._displayMode$.pipe(
    distinctUntilChanged(),
  )

  private _fullscreen$ = new BehaviorSubject(false)
  get fullscreen$(): Observable<boolean> {
    return this._fullscreen$
  }

  constructor() {
    this.root = $('#emulator')
    if (!this.root) {
      throw new Error('No emulator element found')
    }
    this.screen = $('#screen')
    if (!this.screen) {
      throw new Error('No screen element found')
    }
    this.testcard = $('#testcard')
    if (!this.testcard) {
      throw new Error('No testcard element found')
    }

    this.testcard.hide()
    this.canvas = bestCanvas(this.screen[0])

    // forward key events to emulator
    this.screen.on('keyup', (event: JQuery.KeyUpEvent) =>
      this.emulator?.onKeyUp(event),
    )
    this.screen.on('keydown', (event: JQuery.KeyDownEvent) =>
      this.emulator?.onKeyDown(event),
    )
    this.screen.on('blur', () => this.emulator?.clearKeys())

    // create webview audio driver
    this.audioHandler = new CustomAudioHandler(
      $('#audio-warning'),
      audioFilterFreq,
      audioFilterQ,
      noSeek,
    )
    // Firefox will report that audio is suspended even when it will
    // start playing without user interaction, so we need to delay a
    // little to get a reliable indication.
    window.setTimeout(() => this.audioHandler.checkStatus(), 1000)
  }

  async initialise() {
    await this.audioHandler.initialise()
  }

  get displayMode(): DisplayMode | null {
    return this._displayMode$.value
  }

  async boot(model: Model) {
    this.model = model
    try {
      if (this.emulator) {
        this.emulator.shutdown()
        this._displayMode$.next(null)
      }

      this.emulator = new Emulator(model, this.canvas, this.audioHandler)
      await this.emulator.initialise()

      // re-mount any existing disc if we change model
      this.mountDisc(this.discImageFile)

      this.emulator.resume()
      // will automatically unsubscribe when emulator is shutdown
      this.emulator.emulatorUpdate$.subscribe((emulator) =>
        this.onEmulatorUpdate(emulator),
      )
      // forward emulator running state to our own observable
      this.emulator.emulatorRunning$.subscribe((running) => {
        this._emulatorRunning$.next(running)
      })
    } catch (e) {
      notifyHost({ command: ClientCommand.Error, text: (e as Error).message })
      this.emulator = undefined
    }
    this.showTestCard(this.emulator === undefined)
  }

  private onEmulatorUpdate(emulator: Emulator) {
    // update display mode
    const mode = emulator.cpu.readmem(0x0355) ?? 255
    this._displayMode$.next(getDisplayModeInfo(mode))
    // forward emulator update broadcast
    this._emulatorUpdate$.next(emulator)
  }

  GetPC(): number {
    return this.emulator?.cpu.pc ?? 0
  }

  GetInternals(): Array<{ name: string; value: string | number }> {
    // create empty map
    const registers = []
    // add information
    if (this.emulator !== undefined) {
      const cpu = this.emulator.cpu
      registers.push({ name: 'A', value: cpu.a ?? 0 })
      registers.push({ name: 'X', value: cpu.x ?? 0 })
      registers.push({ name: 'Y', value: cpu.y ?? 0 })
      registers.push({ name: 'S', value: cpu.s ?? 0 })
      registers.push({ name: 'P', value: cpu.p.debugString() ?? '' })
      registers.push({ name: 'PC', value: cpu.pc ?? 0 })
      registers.push({ name: 'Cycles', value: cpu.currentCycles ?? 0 })
      registers.push({
        name: 'Next op',
        value: cpu.disassembler.disassemble(cpu.pc, true)[0],
      })
    }
    return registers
  }

  GetMemory(): Uint8Array {
    return this.emulator?.cpu.ramRomOs.subarray(0, 0x10000) || new Uint8Array(0)
  }

  toggleFullscreen() {
    const isFullScreen = !this._fullscreen$.value
    this._fullscreen$.next(isFullScreen)
    this.emulator?.setFullScreen(isFullScreen)
  }

  showTestCard(show: boolean = true) {
    if (show) {
      this.screen.hide()
      this.testcard.show()
    } else {
      this.screen.show()
      this.testcard.hide()
    }
  }

  /**
   * Capture input to the emulator
   */
  focusInput() {
    this.screen.focus()
  }

  async mountDisc(
    discImageFile: DiscImageFile,
    discImageOptions?: DiscImageOptions,
  ): Promise<boolean> {
    this.emulator?.loadDisc(discImageFile, discImageOptions)
    this._discImageFile$.next(discImageFile)
    return true
  }

  async reboot(hard: boolean = false) {
    this.emulator?.resetCpu(hard)
    await this.mountDisc(this.discImageFile)
  }

  suspend() {
    this.emulator?.pause()
  }

  resume() {
    // dont auto resume, make user do this
    this.emulator?.resume()
  }

  step() {
    this.emulator?.dbgr.step()
  }

  stepOver() {
    this.emulator?.dbgr.stepOver()
  }

  stepOut() {
    this.emulator?.dbgr.stepOut()
  }

  SetBreakpoints(addresses: number[]) {
    for (const address of addresses) {
      this.emulator?.dbgr.toggleBreakpoint(address)
    }
  }
}
