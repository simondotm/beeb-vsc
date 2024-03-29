import $ from 'jquery'
import { EmulatorView } from './emulator-view'
import { DisplayModeInfo } from './display-modes'

const EMPTY_CHAR = '⌀'

export class EmulatorInfoBar {
  textCoords: JQuery<HTMLElement>
  graphicsCoords: JQuery<HTMLElement>
  runTime: JQuery<HTMLElement>
  mode: JQuery<HTMLElement>

  constructor(public emulatorView: EmulatorView) {
    this.runTime = $('#infobar-runtime')
    this.mode = $('#infobar-mode')
    this.textCoords = $('#infobar-text-coords')
    this.graphicsCoords = $('#infobar-graphics-coords')

    // coords handlers
    const screen = this.emulatorView.screen
    screen.on('mousemove', (event: JQuery.Event) => this.mouseMove(event))
    screen.on('mouseleave', () => this.mouseLeave())

    setInterval(this.timer.bind(this), 1000)

    this.emulatorView.displayMode$.subscribe((displayInfo) =>
      this.updateScreenMode(displayInfo),
    )
  }

  private timer() {
    this.updateRunTime()
  }

  private mouseLeave() {
    this.updateGraphicsCoords()
    this.updateTextCoords()
  }

  private updateRunTime() {
    const emulator = this.emulatorView.emulator
    let html = EMPTY_CHAR
    if (emulator) {
      const totalSeconds = Math.floor(emulator.cpu.currentCycles / 2000000)
      const seconds = Math.floor(totalSeconds) % 60
      const minutes = Math.floor(totalSeconds / 60) % 60
      const hours = Math.floor(minutes / 60) % 24
      const days = Math.floor(hours / 24)
      const showMinutes = minutes > 0 || hours > 0 || days > 0
      const showHours = hours > 0 || days > 0
      const showDays = days > 0
      const et = `${showDays ? days + 'd ' : ''}${showHours ? hours + 'h ' : ''}${showMinutes ? minutes + 'm ' : ''}${seconds}s`
      html = `Runtime: ${et}`
    }
    this.runTime.html(html)
  }

  private updateScreenMode(displayInfo: DisplayModeInfo | null) {
    this.mode.html(displayInfo ? `Mode ${displayInfo.mode}` : EMPTY_CHAR)
  }

  private updateTextCoords(coords?: { x: number; y: number }) {
    this.textCoords.html(
      coords ? `Ln ${coords.y}, Col ${coords.x}` : EMPTY_CHAR,
    )
  }

  private updateGraphicsCoords(coords?: { x: number; y: number }) {
    this.graphicsCoords.html(
      coords ? `X ${coords.x}, Y ${coords.y}` : EMPTY_CHAR,
    )
  }

  private mouseMove(event: JQuery.Event) {
    if (!event) return
    const screen = this.emulatorView.screen
    const displayInfo = this.emulatorView.displayMode
    if (!displayInfo) return

    const W = displayInfo.text.w
    const H = displayInfo.text.h
    const graphicsMode = displayInfo.type === 'Graphics'

    function clamp(value: number, min: number, max: number) {
      return Math.max(min, Math.min(max, value))
    }

    // 8 and 16 here are fudges to allow for a margin around the screen
    // canvas - not sure exactly where that comes from...
    let x = (event.offsetX ?? 0) - 8
    let y = (event.offsetY ?? 0) - 8
    const sw = (screen.width() ?? 16) - 16
    const sh = (screen.height() ?? 16) - 16
    const X = clamp(Math.floor((x * W) / sw), 0, Math.floor(W) - 1)
    const Y = clamp(Math.floor((y * H) / sh), 0, Math.floor(H) - 1)
    this.updateTextCoords({ x: X, y: Y })

    if (graphicsMode) {
      // Graphics Y increases up the screen.
      y = sh - y
      x = clamp(Math.floor((x * 1280) / sw), 0, 1279)
      y = clamp(Math.floor((y * 1024) / sh), 0, 1023)
      this.updateGraphicsCoords({ x, y })
    } else {
      this.updateGraphicsCoords()
    }
  }
}
