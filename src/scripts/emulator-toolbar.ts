import $ from 'jquery'
import { EmulatorView } from './emulator-view'
import { allModels, findModel } from 'jsbeeb/models'
import { notifyHost } from './vscode'
import { ClientCommand, NO_DISC } from '../types/shared/messages'

export class EmulatorToolBar {
  buttonControl: JQuery<HTMLElement>
  buttonRestart: JQuery<HTMLElement>
  buttonSound: JQuery<HTMLElement>
  buttonExpand: JQuery<HTMLElement>

  modelSelector: JQuery<HTMLElement>
  discSelector: JQuery<HTMLElement>

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
    emulatorView.audioHandler.enabled$.subscribe((enabled) => {
      this.buttonSound.prop('appearance', enabled ? 'secondary' : 'primary')
      this.buttonSound.prop('disabled', !enabled)
    })
    // listener for audio handler mute state changes
    emulatorView.audioHandler.muted$.subscribe((muted) => {
      const element = $('span:first', this.buttonSound)
      element.addClass(muted ? 'codicon-mute' : 'codicon-unmute')
      element.removeClass(muted ? 'codicon-unmute' : 'codicon-mute')
    })

    emulatorView.fullscreen$.subscribe((fullscreen) => {
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

    // populate the disc image selector
    this.discSelector = $('#disc-selector')

    this.emulatorView.discImages$.subscribe((discImages) => {
      this.discSelector.empty()
      const options = [...discImages, NO_DISC]
      const currentDiscName =
        this.emulatorView.emulator?.discImageFile.name ?? NO_DISC.name
      for (const discImage of options) {
        const selected = discImage.name === currentDiscName ? 'selected' : ''
        const option = $(`<vscode-option ${selected} />`)
          .val(`${discImage.url}|${discImage.name}`)
          .text(`${discImage.name} ${selected}`)
        this.discSelector.append(option)
      }

      this.discSelector.append(
        $('<span slot="indicator" class="codicon codicon-save"></span>;='),
      )
      this.discSelector.append($('<vscode-option />').val('A').text('A'))
      this.discSelector.append($('<vscode-option />').val('B').text('B'))
      this.discSelector.append(
        $('<vscode-option />').val(NO_DISC.url).text(NO_DISC.name),
      )
      this.discSelector.append($('<vscode-option />').val('D').text('D'))
    })

    // this.emulatorView.discImages$.subscribe((discImages) => {
    //   this.discSelector.find('vscode-option').remove().end() // empty()
    //   discImages.push(NO_DISC)
    //   const selectedDisc = this.emulatorView.mountedDisc ?? NO_DISC
    //   console.log(`selectedDisc: ${selectedDisc}`)
    //   for (const discImage of discImages) {
    //     console.log(`discImage: ${discImage.name}`)
    //     const selected = discImage.name === selectedDisc.name ? 'selected' : ''
    //     console.log(`selected: ${selected}`)
    //     const option = $(`<vscode-option />`)
    //       .val(discImage.url)
    //       .text(discImage.name)
    //     if (selected) {
    //       option.attr('selected', 'selected')
    //     }
    //     this.discSelector.append(option)
    //   }
    // })

    this.discSelector.on('change', async (event: JQuery.ChangeEvent) =>
      this.onDiscChange(event),
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
    this.emulatorView.focusInput()
    notifyHost({
      command: ClientCommand.Error,
      text: `Selected model '${model.name}'`,
    })
  }

  private async onDiscChange(event: JQuery.ChangeEvent) {
    const value = $(event.target).val() as string
    const [url, name] = value.split('|')
    if (url) {
      await this.emulatorView.emulator?.loadDisc(
        {
          url,
          name,
        },
        true,
      )
    } else {
      this.emulatorView.emulator?.ejectDisc()
    }
    this.emulatorView.focusInput()
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
      this.emulatorView.focusInput()
    }
    this.updateEmulatorStatus()
  }
  private onRestartClick() {
    if (this.buttonRestart) {
      this.emulatorView.emulator?.resetCpu(true)
      this.emulatorView.focusInput()
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
      this.emulatorView.focusInput()
    }
  }
}
