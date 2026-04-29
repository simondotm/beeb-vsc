import { RewindBuffer } from './rewind-buffer'
import { executeUntilFrame, renderThumbnails } from './rewind-thumbnail'

type RewindUiOptions = {
  rewindBuffer: RewindBuffer<unknown>
  processor: any
  video: any
  captureInterval: number
  stop: () => void
  go: () => void
  isRunning: () => boolean
  openButton?: HTMLElement | null
  shouldResumeAfterClose?: () => boolean
  onPause?: () => void
  onSelectionChanged?: () => void
  onRestore?: () => void
}

export class RewindUI {
  private readonly panel: HTMLElement
  private readonly filmstrip: HTMLElement
  private readonly closeButton: HTMLElement | null
  private readonly openButton: HTMLElement | null
  private readonly shouldResumeAfterClose: () => boolean
  private readonly onPause?: () => void
  private readonly onSelectionChanged?: () => void
  private readonly onRestore?: () => void

  private isOpen = false
  private wasRunning = false
  private selectedIndex = -1
  private snapshots: unknown[] = []
  private savedState: unknown = null

  constructor(private readonly options: RewindUiOptions) {
    const panel = document.getElementById('rewind-panel')
    const filmstrip = document.getElementById('rewind-filmstrip')
    if (!panel || !filmstrip) {
      throw new Error('Missing rewind panel elements')
    }

    this.panel = panel
    this.filmstrip = filmstrip
    this.closeButton = document.getElementById('rewind-close')
    this.openButton =
      options.openButton ?? document.getElementById('rewind-open')
    this.shouldResumeAfterClose =
      options.shouldResumeAfterClose ?? (() => this.wasRunning)
    this.onPause = options.onPause
    this.onSelectionChanged = options.onSelectionChanged
    this.onRestore = options.onRestore

    this.onKeyDown = this.onKeyDown.bind(this)

    this.closeButton?.addEventListener('click', () => this.close())
    this.openButton?.addEventListener('click', (event) => {
      event.preventDefault()
      this.open()
    })

    this.updateButtonState()
  }

  open() {
    if (this.isOpen) {
      return
    }

    this.snapshots = this.options.rewindBuffer.getAll()
    if (this.snapshots.length === 0) {
      return
    }

    this.wasRunning = this.options.isRunning()
    if (this.wasRunning) {
      this.options.stop()
      this.onPause?.()
    }

    this.isOpen = true
    this.savedState = this.options.processor.snapshotState()

    try {
      const thumbnails = renderThumbnails(
        this.options.processor,
        this.snapshots,
        this.options.video,
        this.options.captureInterval,
        this.savedState,
      )
      this.populateFilmstrip(thumbnails)
    } catch (error) {
      this.options.processor.restoreState(this.savedState)
      this.closePanel()
      if (this.wasRunning && this.shouldResumeAfterClose()) {
        this.options.go()
      }
      throw error
    }

    this.panel.hidden = false
    document.addEventListener('keydown', this.onKeyDown, true)

    this.selectedIndex = this.snapshots.length - 1
    this.restoreAndPaint(this.selectedIndex)
    this.updateSelectionHighlight()
    this.filmstrip.scrollLeft = this.filmstrip.scrollWidth
  }

  commit() {
    if (!this.isOpen) {
      return
    }

    if (this.selectedIndex >= 0 && this.selectedIndex < this.snapshots.length) {
      this.options.processor.restoreState(this.snapshots[this.selectedIndex])
    }

    this.finish()
  }

  cancel() {
    if (!this.isOpen) {
      return
    }

    this.renderState(this.savedState)
    this.finish()
  }

  close() {
    this.cancel()
  }

  updateButtonState() {
    const disabled = this.options.rewindBuffer.length === 0
    if (this.openButton) {
      this.openButton.toggleAttribute('disabled', disabled)
      this.openButton.setAttribute('aria-disabled', String(disabled))
    }
  }

  selectSnapshot(index: number) {
    if (index < 0 || index >= this.snapshots.length) {
      return
    }

    this.selectedIndex = index
    this.restoreAndPaint(index)
    this.onSelectionChanged?.()
    this.updateSelectionHighlight()
    this.scrollToSelected()
  }

  private finish() {
    this.closePanel()
    this.onRestore?.()
    if (this.wasRunning && this.shouldResumeAfterClose()) {
      this.options.go()
    }
  }

  private closePanel() {
    this.isOpen = false
    this.panel.hidden = true
    this.filmstrip.innerHTML = ''
    this.snapshots = []
    this.savedState = null
    document.removeEventListener('keydown', this.onKeyDown, true)
  }

  private restoreAndPaint(index: number) {
    this.renderState(this.snapshots[index])
  }

  private renderState(state: unknown) {
    this.options.processor.restoreState(state)
    executeUntilFrame(this.options.processor, this.options.video)
    this.options.video.paint()
    this.options.processor.restoreState(state)
  }

  private updateSelectionHighlight() {
    const thumbnails = Array.from(
      this.filmstrip.querySelectorAll<HTMLElement>('.rewind-thumb'),
    )
    for (const thumbnail of thumbnails) {
      thumbnail.classList.toggle(
        'selected',
        Number(thumbnail.dataset.index) === this.selectedIndex,
      )
    }
  }

  private scrollToSelected() {
    const selected = this.filmstrip.querySelector<HTMLElement>(
      '.rewind-thumb.selected',
    )
    selected?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  }

  private populateFilmstrip(
    thumbnails: Array<{
      canvas: HTMLCanvasElement
      index: number
      ageSeconds: number
    }>,
  ) {
    this.filmstrip.innerHTML = ''

    for (const { canvas, index, ageSeconds } of thumbnails) {
      const wrapper = document.createElement('div')
      wrapper.className = 'rewind-thumb'
      wrapper.dataset.index = String(index)
      wrapper.appendChild(canvas)

      const label = document.createElement('span')
      label.className = 'rewind-thumb-label'
      label.textContent = ageSeconds === 0 ? 'now' : `-${ageSeconds}s`
      wrapper.appendChild(label)

      wrapper.addEventListener('click', () => this.selectSnapshot(index))
      this.filmstrip.appendChild(wrapper)
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        this.cancel()
        break
      case 'Enter':
        event.preventDefault()
        event.stopPropagation()
        this.commit()
        break
      case 'ArrowLeft':
        event.preventDefault()
        event.stopPropagation()
        if (this.selectedIndex > 0) {
          this.selectSnapshot(this.selectedIndex - 1)
        }
        break
      case 'ArrowRight':
        event.preventDefault()
        event.stopPropagation()
        if (this.selectedIndex < this.snapshots.length - 1) {
          this.selectSnapshot(this.selectedIndex + 1)
        }
        break
      default:
        event.stopPropagation()
        break
    }
  }
}
