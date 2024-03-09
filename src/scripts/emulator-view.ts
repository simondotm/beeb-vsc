import $ from 'jquery'
import { bestCanvas } from 'jsbeeb/canvas'
import { Emulator, EmulatorCanvas } from './emulator'
import { Model } from 'jsbeeb/models'
import { CustomAudioHandler } from './custom-audio-handler'
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs'
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

  // currently selected disc image
  private _discImageFile$ = new BehaviorSubject<DiscImageFile>(NO_DISC)
  get discImageFile$(): Observable<DiscImageFile> {
    return this._discImageFile$
  }
  get discImageFile(): DiscImageFile {
    return this._discImageFile$.value
  }

  // disc images in the current workspace
  private _discImages$ = new BehaviorSubject<DiscImageFile[]>([])
  get discImages$(): Observable<DiscImageFile[]> {
    return this._discImages$
  }

  setDiscImages(discImages: DiscImageFile[]) {
    this._discImages$.next(discImages)
  }

  // observables
  private _displayMode$ = new BehaviorSubject<DisplayMode>(null)
  readonly displayMode$: Observable<DisplayMode>

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

    // setup observables
    this.displayMode$ = this._displayMode$.pipe(distinctUntilChanged())
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

      this.emulator.start()
      // will automatically unsubscribe when emulator is shutdown
      this.emulator.emulatorUpdate$.subscribe((emulator) =>
        this.onEmulatorUpdate(emulator),
      )
    } catch (e) {
      notifyHost({ command: ClientCommand.Error, text: (e as Error).message })
      this.emulator = undefined
    }
    this.showTestCard(this.emulator === undefined)
  }

  private onEmulatorUpdate(_emulator: Emulator) {
    // update display mode
    const mode = this.emulator?.cpu.readmem(0x0355) ?? 255
    this._displayMode$.next(getDisplayModeInfo(mode))
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

  async resetCpu(hard: boolean = false) {
    this.emulator?.resetCpu(hard)
    await this.mountDisc(this.discImageFile)
  }
}
