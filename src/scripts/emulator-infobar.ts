import { getElementById } from './dom'
import { EmulatorView } from './emulator-view'

const EMPTY_CHAR = '⌀'

export class EmulatorInfoBar {
  textCoords: HTMLElement
  graphicsCoords: HTMLElement
  runTime: HTMLElement
  mode: HTMLElement

  constructor(public emulatorView: EmulatorView) {
    this.runTime = getElementById('infobar-runtime')
    this.mode = getElementById('infobar-mode')
    this.textCoords = getElementById('infobar-text-coords')
    this.graphicsCoords = getElementById('infobar-graphics-coords')

    // coords handlers
    const screen = this.emulatorView.screen
    screen.mousemove((event: any) => this.mouseMove(event))
    screen.mouseleave(() => this.mouseLeave())

    setInterval(this.timer.bind(this), 1000)
  }

  private timer() {
    const emulator = this.emulatorView.emulator
    let html = EMPTY_CHAR
    if (emulator) {
      const totalSeconds = Math.floor(emulator.cpu.currentCycles / 2000000)
      const seconds = totalSeconds % 60
      const minutes = Math.floor(totalSeconds / 60)
      const hours = Math.floor(minutes / 60)
      const et = `${hours ? hours : ''}${hours ? 'h ' : ''}${minutes ? minutes : ''}${minutes ? 'm ' : ''}${seconds ? seconds : ''}${seconds ? 's' : ''}`
      html = `Runtime: ${et}`
    }
    this.runTime.innerHTML = html
    this.updateScreenMode()
  }

  private mouseLeave() {
    this.updateGraphicsCoords()
    this.updateTextCoords()
  }

  private updateScreenMode() {
    const emulator = this.emulatorView.emulator
    this.mode.innerHTML = emulator
      ? `Mode ${emulator.getScreenMode()}`
      : EMPTY_CHAR
  }

  private updateTextCoords(coords?: { x: number; y: number }) {
    this.textCoords.innerHTML = coords
      ? `Ln ${coords.y}, Col ${coords.x}`
      : EMPTY_CHAR
  }

  private updateGraphicsCoords(coords?: { x: number; y: number }) {
    this.graphicsCoords.innerHTML = coords
      ? `X ${coords.x}, Y ${coords.y}`
      : EMPTY_CHAR
  }

  private mouseMove(event: any) {
    const emulator = this.emulatorView.emulator
    const screen = this.emulatorView.screen
    if (!emulator) return

    let W
    let H
    let graphicsMode = true

    const screenMode = emulator.getScreenMode()
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
    this.updateTextCoords({ x: X, y: Y })

    if (graphicsMode) {
      // Graphics Y increases up the screen.
      y = sh - y
      x = Math.floor((x * 1280) / sw)
      y = Math.floor((y * 1024) / sh)
      this.updateGraphicsCoords({ x, y })
    } else {
      this.updateGraphicsCoords()
    }
  }
}
