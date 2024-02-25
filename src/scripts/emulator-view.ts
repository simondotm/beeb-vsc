import $ from 'jquery'
import { bestCanvas } from 'jsbeeb/canvas'
import { Emulator, EmulatorCanvas } from './emulator'
import { ClientCommand } from '../types/shared/messages'
import { Model } from 'jsbeeb/models'
import { notifyHost } from './vscode'

export class EmulatorView {
  root: JQuery<HTMLElement> // root element
  screen: JQuery<HTMLElement> // screen element
  testcard: JQuery<HTMLElement> // testcard element
  canvas: EmulatorCanvas
  emulator: Emulator | undefined // Dont hold references to the emulator, it may be paused and destroyed
  model: Model | undefined

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
    screen.keyup((event: any) => this.emulator?.keyUp(event))
    screen.keydown((event: any) => this.emulator?.keyDown(event))
    screen.blur(() => this.emulator?.clearKeys())
  }

  async boot(model: Model) {
    this.model = model
    try {
      this.showTestCard(false)

      // any previously running emulator must be paused
      // before tear down, otherwise it will continue to paint itself
      if (this.emulator) {
        this.emulator.pause()
      }

      this.emulator = new Emulator(this.canvas, model)
      await this.emulator.initialise()
      notifyHost({ command: ClientCommand.EmulatorReady })

      const discUrl = window.JSBEEB_DISC
      this.emulator.loadDisc(discUrl)
      // if (discUrl) {
      // 	const fdc = this.emulator.cpu.fdc;
      // 	const discData = await utils.defaultLoadData(discUrl);
      // 	const discImage = new BaseDisc(fdc, 'disc', discData, () => {});
      // 	this.emulator.cpu.fdc.loadDisc(0, discImage);
      // }
      this.emulator.start()
    } catch (e: any) {
      this.showTestCard(true)
      notifyHost({ command: ClientCommand.Error, text: e.message })
    }
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
