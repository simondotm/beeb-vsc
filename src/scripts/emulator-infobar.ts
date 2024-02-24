import { EmulatorView } from './emulator-view'

export class EmulatorInfoBar {
  emuStatus: HTMLElement // = document.getElementById('emu_status');
  showCoords: boolean

  constructor(public emulatorView: EmulatorView) {
    console.log('EmulatorInfoBar constructor')

    const emuStatus = document.getElementById('emu_status')
    if (!emuStatus) {
      throw new Error('No emu_status element found')
    }
    this.emuStatus = emuStatus
    this.showCoords = false // coordinate display mode

    const screen = this.emulatorView.screen
    // coords handlers
    screen.mousemove((event: any) => this.mouseMove(event))
    screen.mouseleave(() => this.mouseLeave())

    setInterval(this.timer.bind(this), 1000)
  }

  private timer() {
    const model = this.emulatorView.model
    const emulator = this.emulatorView.emulator
    if (emulator && !this.showCoords) {
      this.emuStatus.innerHTML = `${model?.name} | ${Math.floor(emulator.cpu.currentCycles / 2000000)} s`
    }
  }

  private mouseLeave() {
    this.showCoords = false
    this.timer()
  }

  private mouseMove(event: any) {
    const emulator = this.emulatorView.emulator
    const screen = this.emulatorView.screen
    if (!emulator) return
    this.showCoords = true
    const processor = emulator.cpu
    // const screen = this.screen // this.root.find('.screen');
    const screenMode = processor.readmem(0x0355)
    let W
    let H
    let graphicsMode = true
    switch (screenMode) {
      case 0:
        W = 80
        H = 32
        break
      case 1:
      case 4:
        W = 40
        H = 32
        break
      case 2:
      case 5:
        W = 20
        H = 32
        break
      case 3:
        W = 80
        H = 25.6
        graphicsMode = false
        break
      case 6:
        W = 40
        H = 25.6
        graphicsMode = false
        break
      case 7:
        W = 40
        H = 25.6
        graphicsMode = false
        break
      default:
        // Unknown screen mode!
        return
    }
    // 8 and 16 here are fudges to allow for a margin around the screen
    // canvas - not sure exactly where that comes from...
    let x = event.offsetX - 8
    let y = event.offsetY - 8
    const sw = (screen.width() ?? 16) - 16
    const sh = (screen.height() ?? 16) - 16
    const X = Math.floor((x * W) / sw)
    const Y = Math.floor((y * H) / sh)
    let html = `Text: (${X},${Y})`
    if (graphicsMode) {
      // Graphics Y increases up the screen.
      y = sh - y
      x = Math.floor((x * 1280) / sw)
      y = Math.floor((y * 1024) / sh)
      html += ` &nbsp; Graphics: (${x},${y})`
    }
    this.emuStatus.innerHTML = html
  }
}
