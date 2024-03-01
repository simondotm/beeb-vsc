import $ from 'jquery'
import { bestCanvas } from 'jsbeeb/canvas'
import { EmulatorCanvas } from './emulator'
import { Model } from 'jsbeeb/models'
import { CustomAudioHandler } from './custom-audio-handler'
import { BehaviorSubject } from 'rxjs'
import { EmulatorService } from './emulator-service'

const audioFilterFreq = 7000
const audioFilterQ = 5
const noSeek = false

export class EmulatorView {
  root: JQuery<HTMLElement> // root element
  screen: JQuery<HTMLElement> // screen element
  testcard: JQuery<HTMLElement> // testcard element
  canvas: EmulatorCanvas
  model: Model | undefined
  audioHandler: CustomAudioHandler
  emulatorService: EmulatorService

  fullscreen = new BehaviorSubject(false)

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
    screen.on('keyup', (event: JQuery.Event) =>
      this.emulatorService.emulator?.onKeyUp(event),
    )
    screen.on('keydown', (event: JQuery.Event) =>
      this.emulatorService.emulator?.onKeyDown(event),
    )
    screen.on('blur', () => this.emulatorService.emulator?.clearKeys())

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

    this.emulatorService = new EmulatorService(this.canvas, this.audioHandler)
  }

  async initialise() {
    await this.audioHandler.initialise()
  }

  async boot(model: Model) {
    await this.emulatorService.boot(model)
  }

  // async boot(model: Model) {
  //   this.model = model
  //   try {
  //     this.showTestCard(false)

  //     // any previously running emulator must be paused
  //     // before tear down, otherwise it will continue to paint itself
  //     if (this.emulator) {
  //       this.emulator.pause()
  //     }

  //     this.emulator = new Emulator(model, this.canvas, this.audioHandler)
  //     await this.emulator.initialise()
  //     notifyHost({ command: ClientCommand.EmulatorReady })

  //     const discUrl = window.JSBEEB_DISC
  //     await this.emulator.loadDisc(discUrl)
  //     // if (discUrl) {
  //     // 	const fdc = this.emulator.cpu.fdc;
  //     // 	const discData = await utils.defaultLoadData(discUrl);
  //     // 	const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
  //     // 	this.emulator.cpu.fdc.loadDisc(0, discImage);
  //     // }
  //     this.emulator.start()
  //   } catch (e) {
  //     this.showTestCard(true)
  //     notifyHost({ command: ClientCommand.Error, text: (e as Error).message })
  //   }
  // }

  toggleFullscreen() {
    const isFullScreen = !this.fullscreen.value
    this.fullscreen.next(isFullScreen)
    this.emulatorService.emulator?.setFullScreen(isFullScreen)
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
}
