import { EmulatorView } from './emulator-view'
import { allModels, findModel } from 'jsbeeb/models'
import { notifyHost } from './vscode'
import { ClientCommand, DiscImageFile, NO_DISC } from '../types/shared/messages'

type ControlElement = HTMLElement & {
  appearance?: string
  disabled?: boolean
  value?: string
}

export class EmulatorToolBar {
  buttonControl: ControlElement
  buttonRestart: ControlElement
  buttonRewind: ControlElement
  buttonSound: ControlElement
  buttonExpand: ControlElement
  buttonControlIcon: HTMLElement
  buttonSoundIcon: HTMLElement
  buttonExpandIcon: HTMLElement

  modelSelector: ControlElement
  discSelector: ControlElement

  constructor(public emulatorView: EmulatorView) {
    this.buttonControl = this.getRequiredElement('toolbar-control')
    this.buttonRestart = this.getRequiredElement('toolbar-restart')
    this.buttonRewind = this.getRequiredElement('toolbar-rewind')
    this.buttonSound = this.getRequiredElement('toolbar-sound')
    this.buttonExpand = this.getRequiredElement('toolbar-expand')
    this.buttonControlIcon = this.getRequiredButtonIcon('toolbar-control')
    this.buttonSoundIcon = this.getRequiredButtonIcon('toolbar-sound')
    this.buttonExpandIcon = this.getRequiredButtonIcon('toolbar-expand')

    this.buttonControl.addEventListener('click', () => this.onControlClick())
    this.buttonRestart.addEventListener('click', async () =>
      this.onRestartClick(),
    )
    this.buttonSound.addEventListener('click', () => this.onSoundClick())
    this.buttonExpand.addEventListener('click', () => this.onExpandClick())

    // listener for audio handler state changes
    emulatorView.audioHandler.enabled$.subscribe((_enabled) => {
      this.updateSoundButton()
    })
    // listener for audio handler mute state changes
    emulatorView.audioHandler.muted$.subscribe((muted) => {
      const element = this.buttonSoundIcon
      element.classList.add(muted ? 'codicon-mute' : 'codicon-unmute')
      element.classList.remove(muted ? 'codicon-unmute' : 'codicon-mute')
    })

    emulatorView.fullscreen$.subscribe((fullscreen) => {
      const element = this.buttonExpandIcon
      element.classList.add(
        fullscreen ? 'codicon-screen-full' : 'codicon-screen-normal',
      )
      element.classList.remove(
        fullscreen ? 'codicon-screen-normal' : 'codicon-screen-full',
      )
    })

    // populate the model selector
    const modelSelector = (this.modelSelector =
      this.getRequiredElement('model-selector'))
    const model = emulatorView.model
    for (const availableModel of allModels) {
      const name = availableModel.name
      const selected = name === model?.name ? 'selected' : ''
      const option = document.createElement('vscode-option') as ControlElement
      if (selected) {
        option.setAttribute('selected', '')
      }
      option.value = name
      option.textContent = name
      modelSelector.appendChild(option)
    }

    this.modelSelector.addEventListener('change', async (event: Event) =>
      this.onModelChange(event),
    )

    // populate the disc image selector
    this.discSelector = this.getRequiredElement('disc-selector')
    this.emulatorView.discImages$.subscribe((discImages) =>
      this.onDiscImagesUpdate(discImages),
    )

    // update the disc image selector when the current disc image changes
    this.emulatorView.discImageFile$.subscribe((discImage) =>
      this.onDiscImageUpdate(discImage),
    )

    this.discSelector.addEventListener('change', async (event: Event) =>
      this.onDiscChange(event),
    )

    this.emulatorView.emulatorRunning$.subscribe((isRunning) =>
      this.onEmulatorRunStateChange(isRunning),
    )
    this.emulatorView.debugMode$.subscribe(() => this.updateRewindButton())
    this.emulatorView.rewindAvailable$.subscribe(() =>
      this.updateRewindButton(),
    )
  }

  private async onModelChange(event: Event) {
    const value = this.getElementValue(event.target)
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

  private async onDiscChange(event: Event) {
    const value = this.getElementValue(event.target)
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
    this.discSelector.querySelectorAll('vscode-option').forEach((option) => {
      option.remove()
    })
    this.discSelector.value = ''
    const options = [...discImages, NO_DISC]
    const currentDiscName = this.emulatorView.discImageFile.name ?? NO_DISC.name
    for (const discImage of options) {
      const selected = discImage.name === currentDiscName ? 'selected' : ''
      const option = document.createElement('vscode-option') as ControlElement
      if (selected) {
        option.setAttribute('selected', '')
      }
      option.value = `${discImage.url}|${discImage.name}`
      option.textContent = `${discImage.name}`
      this.discSelector.appendChild(option)
    }
  }

  private onDiscImageUpdate(discImage: DiscImageFile) {
    this.discSelector.value = `${discImage.url}|${discImage.name}`
  }

  private onEmulatorRunStateChange(isRunning: boolean) {
    if (isRunning) {
      const icon = this.buttonControlIcon
      icon.classList.remove('codicon-debug-start')
      icon.classList.add('codicon-debug-pause')
    } else {
      const icon = this.buttonControlIcon
      icon.classList.remove('codicon-debug-pause')
      icon.classList.add('codicon-debug-start')
    }
    this.setDisabled(this.buttonRestart, !isRunning)
    this.setDisabled(this.buttonExpand, !isRunning)
    this.buttonControl.appearance = isRunning ? 'secondary' : 'primary'

    // bit of a hack to disable the audio warning so we dont get mute state messed up if not running emulator
    this.setDisabled(this.emulatorView.audioHandler.warningNode, !isRunning)
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

  private updateRewindButton() {
    const debugMode = this.emulatorView.debugMode
    this.buttonRewind.hidden = !debugMode
    this.setDisabled(
      this.buttonRewind,
      !debugMode || !this.emulatorView.rewindAvailable,
    )
  }

  private updateSoundButton() {
    const audioEnabled = this.emulatorView.audioHandler.isEnabled()
    const buttonEnabled = audioEnabled && this.emulatorView.emulatorRunning
    this.buttonSound.appearance = audioEnabled ? 'secondary' : 'primary'
    this.setDisabled(this.buttonSound, !buttonEnabled)
  }

  private getRequiredElement(id: string): ControlElement {
    const element = document.getElementById(id) as ControlElement | null
    if (!element) {
      throw new Error(`Missing toolbar element '${id}'`)
    }

    return element
  }

  private getRequiredButtonIcon(buttonId: string): HTMLElement {
    const button = this.getRequiredElement(buttonId)
    const icon = button.querySelector('span')
    if (!icon) {
      throw new Error(`Expected toolbar button icon span for '${buttonId}'`)
    }

    return icon as HTMLElement
  }

  private getElementValue(target: EventTarget | null): string {
    const element = target as ControlElement | null
    return element?.value ?? ''
  }

  private setDisabled(element: ControlElement, disabled: boolean) {
    element.disabled = disabled
    element.toggleAttribute('disabled', disabled)
  }
}
