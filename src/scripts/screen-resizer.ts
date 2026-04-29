import ResizeObserver from 'resize-observer-polyfill'

export class ScreenResizer {
  screen: HTMLElement
  desiredAspectRatio: number
  minHeight: number
  minWidth: number
  observer: ResizeObserver

  constructor(screen: HTMLElement) {
    this.screen = screen
    const rect = screen.getBoundingClientRect()
    const origHeight = rect.height
    const origWidth = rect.width
    if (origWidth === 0 || origHeight === 0) {
      throw new Error(
        'ScreenResizer: screen must have a defined height and width',
      )
    }
    this.desiredAspectRatio = origWidth / origHeight
    this.minHeight = origHeight / 4
    this.minWidth = origWidth / 4
    this.observer = new ResizeObserver(() => this.resizeScreen())
    if (!this.screen.parentElement) {
      throw new Error('ScreenResizer: screen must have a parent element')
    }
    this.observer.observe(this.screen.parentElement)
    this.resizeScreen()
  }

  resizeScreen() {
    const InnerBorder = 0
    const parent = this.screen.parentElement
    if (!parent) {
      return
    }
    const innerWidth = parent.clientWidth
    const innerHeight = parent.clientHeight
    if (innerWidth === 0 || innerHeight === 0) {
      throw new Error(
        'ScreenResizer: screen must have a defined height and width',
      )
    }
    let width = Math.max(this.minWidth, innerWidth - InnerBorder)
    let height = Math.max(this.minHeight, innerHeight - InnerBorder)
    if (width / height <= this.desiredAspectRatio) {
      height = width / this.desiredAspectRatio
    } else {
      width = height * this.desiredAspectRatio
    }
    this.screen.style.height = `${height}px`
    this.screen.style.width = `${width}px`
  }
}
