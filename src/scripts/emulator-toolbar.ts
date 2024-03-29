import $ from 'jquery'
import { EmulatorView } from './emulator-view'
import { allModels, findModel } from 'jsbeeb/models'
import { notifyHost } from './vscode'
import { ClientCommand, DiscImageFile, NO_DISC } from '../types/shared/messages'

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
    this.buttonRestart.on('click', async () => this.onRestartClick())
    this.buttonSound.on('click', () => this.onSoundClick())
    this.buttonExpand.on('click', () => this.onExpandClick())

    // listener for audio handler state changes
    emulatorView.audioHandler.enabled$.subscribe((_enabled) => {
      this.updateSoundButton()
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

    this.modelSelector.on('change', async (event: JQuery.ChangeEvent) =>
      this.onModelChange(event),
    )

    // populate the disc image selector
    this.discSelector = $('#disc-selector')
    this.emulatorView.discImages$.subscribe((discImages) =>
      this.onDiscImagesUpdate(discImages),
    )

    // update the disc image selector when the current disc image changes
    this.emulatorView.discImageFile$.subscribe((discImage) =>
      this.onDiscImageUpdate(discImage),
    )

    this.discSelector.on('change', async (event: JQuery.ChangeEvent) =>
      this.onDiscChange(event),
    )

    this.emulatorView.emulatorRunning$.subscribe((isRunning) =>
      this.onEmulatorRunStateChange(isRunning),
    )
  }

  private async onModelChange(event: JQuery.ChangeEvent) {
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
    await this.emulatorView.boot(model)
    this.emulatorView.focusInput()
    // notifyHost({
    //   command: ClientCommand.Info,
    //   text: `Selected model '${model.name}'`,
    // })
  }

  private async onDiscChange(event: JQuery.ChangeEvent) {
    const value = $(event.target).val() as string
    const [url, name] = value.split('|')
    await this.emulatorView.mountDisc(
      {
        url,
        name,
      },
      {},
    )
    this.emulatorView.focusInput()
  }

  private onDiscImagesUpdate(discImages: DiscImageFile[]) {
    // dont use empty, because we have a span child node for the icon
    this.discSelector.find('vscode-option').remove().end()
    this.discSelector.val('')
    const options = [...discImages, NO_DISC]
    const currentDiscName = this.emulatorView.discImageFile.name ?? NO_DISC.name
    for (const discImage of options) {
      const selected = discImage.name === currentDiscName ? 'selected' : ''
      const option = $(`<vscode-option ${selected} />`)
        .val(`${discImage.url}|${discImage.name}`)
        .text(`${discImage.name}`)
      this.discSelector.append(option)
    }
  }

  private onDiscImageUpdate(discImage: DiscImageFile) {
    this.discSelector.val(`${discImage.url}|${discImage.name}`)
  }

  private onEmulatorRunStateChange(isRunning: boolean) {
    if (isRunning) {
      $('span:first', this.buttonControl).removeClass('codicon-debug-start')
      $('span:first', this.buttonControl).addClass('codicon-debug-pause')
    } else {
      $('span:first', this.buttonControl).removeClass('codicon-debug-pause')
      $('span:first', this.buttonControl).addClass('codicon-debug-start')
    }
    this.buttonRestart.prop('disabled', !isRunning)
    this.buttonExpand.prop('disabled', !isRunning)
    this.buttonControl.prop('appearance', isRunning ? 'secondary' : 'primary')

    // bit of a hack to disable the audio warning so we dont get mute state messed up if not running emulator
    this.emulatorView.audioHandler.warningNode.prop('disabled', !isRunning)
    this.updateSoundButton()
  }

  private onControlClick() {
    const emulator = this.emulatorView.emulator
    if (emulator?.emulatorRunning) {
      emulator.pause()
    } else {
      emulator?.resume()
      this.emulatorView.focusInput()
    }
  }
  private async onRestartClick() {
    if (this.buttonRestart) {
      await this.emulatorView.reboot(true)
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
  private updateSoundButton() {
    const audioEnabled = this.emulatorView.audioHandler.isEnabled()
    const buttonEnabled = audioEnabled && this.emulatorView.emulatorRunning
    this.buttonSound.prop('appearance', audioEnabled ? 'secondary' : 'primary')
    this.buttonSound.prop('disabled', !buttonEnabled)
  }
}
