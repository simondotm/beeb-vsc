import $ from 'jquery'
import { EmulatorView } from './emulator-view'
import { allModels, findModel } from 'jsbeeb/models'
import { notifyHost } from './vscode'
import { ClientCommand } from '../types/shared/messages'

export class EmulatorToolBar {
  buttonControl: JQuery<HTMLElement>
  buttonRestart: JQuery<HTMLElement>
  buttonSound: JQuery<HTMLElement>
  buttonExpand: JQuery<HTMLElement>

  modelSelector: JQuery<HTMLElement>

  constructor(public emulatorView: EmulatorView) {
    this.buttonControl = $('#toolbar-control')
    this.buttonRestart = $('#toolbar-restart')
    this.buttonSound = $('#toolbar-sound')
    this.buttonExpand = $('#toolbar-expand')

    this.buttonControl.on('click', () => this.onControlClick())
    this.buttonRestart.on('click', () => this.onRestartClick())
    this.buttonSound.on('click', () => this.onSoundClick())
    this.buttonExpand.on('click', () => this.onExpandClick())

    // listener for audio handler state changes
    emulatorView.audioHandler.enabled.subscribe((enabled) => {
      this.buttonSound.prop('appearance', enabled ? 'secondary' : 'primary')
      this.buttonSound.prop('disabled', !enabled)
    })
    // listener for audio handler mute state changes
    emulatorView.audioHandler.muted.subscribe((muted) => {
      const element = $('span:first', this.buttonSound)
      element.addClass(muted ? 'codicon-mute' : 'codicon-unmute')
      element.removeClass(muted ? 'codicon-unmute' : 'codicon-mute')
    })

    emulatorView.fullscreen.subscribe((fullscreen) => {
      const element = $('span:first', this.buttonExpand)
      element.addClass(
        fullscreen ? 'codicon-screen-full' : 'codicon-screen-normal',
      )
      element.removeClass(
        fullscreen ? 'codicon-screen-normal' : 'codicon-screen-full',
      )
    })

    // populate the model selector
    const modelSelector = (this.modelSelector = $('#model-selector'))
    const model = emulatorView.model
    $.each(allModels, function () {
      const name = this.name // 'this' is a Model inside the each() iterator
      const selected = name === model?.name ? 'selected' : ''
      modelSelector.append(
        $(`<vscode-option ${selected} />`).val(name).text(name),
      )
    })

    this.modelSelector.on('change', (event: JQuery.ChangeEvent) =>
      this.onModelChange(event),
    )

    this.updateEmulatorStatus()
  }

  private onModelChange(event: JQuery.ChangeEvent) {
    const value = $(event.target).val() as string
    console.log(value)
    const model = findModel(value)
    if (model === null) {
      notifyHost({
        command: ClientCommand.Error,
        text: `Failed to select model '${value}'`,
      })
      this.emulatorView.showTestCard(true)
      return
    }
    console.log(JSON.stringify(model))
    this.emulatorView.boot(model).then(() => {
      this.updateEmulatorStatus()
    })
  }

  private updateEmulatorStatus() {
    const isRunning = this.emulatorView.emulator?.running
    if (isRunning) {
      $('span:first', this.buttonControl).removeClass('codicon-debug-start')
      $('span:first', this.buttonControl).addClass('codicon-debug-pause')
    } else {
      $('span:first', this.buttonControl).removeClass('codicon-debug-pause')
      $('span:first', this.buttonControl).addClass('codicon-debug-start')
    }
    this.buttonRestart.prop('disabled', !isRunning)
    this.buttonControl.prop('appearance', isRunning ? 'secondary' : 'primary')
  }

  private onControlClick() {
    const emulator = this.emulatorView.emulator
    if (emulator?.running) {
      emulator.pause()
    } else {
      emulator?.start()
    }
    this.updateEmulatorStatus()
  }
  private onRestartClick() {
    if (this.buttonRestart) {
      this.emulatorView.emulator?.cpu.reset(true)
    }
  }
  private onSoundClick() {
    if (this.buttonSound) {
      this.emulatorView.audioHandler.toggleMute()
    }
  }
  private onExpandClick() {
    if (this.buttonExpand) {
      this.emulatorView.toggleFullscreen()
    }
  }
}
