import { Model } from 'jsbeeb/models'
import { Emulator, EmulatorCanvas } from './emulator'
import { notifyHost } from './vscode'
import { ClientCommand } from '../types/shared/messages'
import {
  BehaviorSubject,
  Observable,
  Subscription,
  distinctUntilChanged,
  map,
} from 'rxjs'
import { CustomAudioHandler } from './custom-audio-handler'
import { DisplayMode, getDisplayModeInfo } from './display-modes'

/**
 * EmulatorService encapsulates and manages the emulator lifecycle.
 */
export class EmulatorService {
  emulator: Emulator | undefined // Dont hold references to the emulator, it may be paused and destroyed
  model: Model | undefined

  // private emulatorInstance = new BehaviorSubject<Emulator | undefined>(undefined)
  // emulator$: Observable<Emulator | undefined> = this.emulatorInstance.asObservable()

  private mode$ = new BehaviorSubject<number>(255)
  displayMode$: Observable<DisplayMode>

  private emulatorUpdateListener: Subscription | undefined //  Observable<Emulator> | undefined

  constructor(
    public canvas: EmulatorCanvas,
    public audioHandler: CustomAudioHandler,
  ) {
    this.displayMode$ = this.mode$.pipe(
      distinctUntilChanged(),
      map((mode) => getDisplayModeInfo(mode)),
    )
  }

  getScreenMode() {
    return this.emulator?.cpu.readmem(0x0355) ?? 255
  }

  private updateScreenMode() {
    // const mode = getDisplayModeInfo(this.getScreenMode())
    const mode = this.getScreenMode()
    this.mode$.next(mode)
  }

  async boot(model: Model) {
    this.model = model
    try {
      // this.showTestCard(false)

      // any previously running emulator must be paused
      // before tear down, otherwise it will continue to paint itself
      if (this.emulator) {
        this.emulator.pause()
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
      this.emulatorUpdateListener = this.emulator.emulatorUpdate$.subscribe(
        (emulator) => this.onEmulatorUpdate(emulator),
      )
    } catch (e) {
      // this.showTestCard(true)
      notifyHost({ command: ClientCommand.Error, text: (e as Error).message })
      this.emulator = undefined
    }

    // this.emulatorInstance.next(this.emulator)
  }

  private onEmulatorUpdate(_emulator: Emulator) {
    this.updateScreenMode()
  }
}
