import { Model } from 'jsbeeb/models'
import { Emulator, EmulatorCanvas } from './emulator'
import { notifyHost } from './vscode'
import { ClientCommand } from '../types/shared/messages'
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs'
import { CustomAudioHandler } from './custom-audio-handler'
import { DisplayMode, getDisplayModeInfo } from './display-modes'

/**
 * EmulatorService encapsulates and manages the emulator lifecycle.
 */
export class EmulatorService {
  emulator: Emulator | undefined // Dont hold references to the emulator, it may be paused and destroyed
  model: Model | undefined

  private _displayMode$ = new BehaviorSubject<DisplayMode>(null)
  readonly displayMode$: Observable<DisplayMode>

  constructor(
    public canvas: EmulatorCanvas,
    public audioHandler: CustomAudioHandler,
  ) {
    this.displayMode$ = this._displayMode$.pipe(distinctUntilChanged())
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
      // this.showTestCard(true)
      notifyHost({ command: ClientCommand.Error, text: (e as Error).message })
      this.emulator = undefined
    }
  }

  private onEmulatorUpdate(_emulator: Emulator) {
    // update display mode
    const mode = this.emulator?.cpu.readmem(0x0355) ?? 255
    this._displayMode$.next(getDisplayModeInfo(mode))
  }
}
