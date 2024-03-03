import $ from 'jquery'
import { bestCanvas } from 'jsbeeb/canvas'
import { Emulator, EmulatorCanvas } from './emulator'
import { Model } from 'jsbeeb/models'
import { CustomAudioHandler } from './custom-audio-handler'
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs'
import { DisplayMode, getDisplayModeInfo } from './display-modes'
import { notifyHost } from './vscode'
import { ClientCommand } from '../types/shared/messages'

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

  // observables
  private _displayMode$ = new BehaviorSubject<DisplayMode>(null)
  readonly displayMode$: Observable<DisplayMode>

  private _fullscreen$ = new BehaviorSubject(false)
  get fullscreen$(): Observable<boolean> {
    return this._fullscreen$
  }

  constructor() {
    const root = $('#emulator')
    this.root = root
    const screen = this.root.find('.screen')
    if (!screen) {
      throw new Error('No screen element found')
    }
    this.testcard = $('#testcard')
    this.testcard.hide()
    this.screen = screen
    this.canvas = bestCanvas(screen[0])

    // forward key events to emulator
    screen.on('keyup', (event: JQuery.KeyUpEvent) =>
      this.emulator?.onKeyUp(event),
    )
    screen.on('keydown', (event: JQuery.KeyDownEvent) =>
      this.emulator?.onKeyDown(event),
    )
    screen.on('blur', () => this.emulator?.clearKeys())

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
      notifyHost({ command: ClientCommand.EmulatorReady })

      const discUrl = window.JSBEEB_DISC
      await this.emulator.loadDisc(discUrl)
      // if (discUrl) {
      // 	const fdc = this.emulator.cpu.fdc;
      // 	const discData = await utils.defaultLoadData(discUrl);
      // 	const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
      // 	this.emulator.cpu.fdc.loadDisc(0, discImage);
      // }

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

  focus() {
    this.screen.focus()
  }
}
