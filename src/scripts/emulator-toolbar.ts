import $ from 'jquery'
import { EmulatorView } from './emulator-view'

export class EmulatorToolBar {
  buttonControl: JQuery<HTMLElement>
  buttonRestart: JQuery<HTMLElement>
  buttonSound: JQuery<HTMLElement>
  buttonExpand: JQuery<HTMLElement>

  test: boolean = true

  constructor(public emulatorView: EmulatorView) {
    this.buttonControl = $('#toolbar-control')
    this.buttonRestart = $('#toolbar-restart')
    this.buttonSound = $('#toolbar-sound')
    this.buttonExpand = $('#toolbar-expand')

    this.buttonControl.on('click', () => this.onControlClick())
    this.buttonRestart.on('click', () => this.onRestartClick())
    this.buttonSound.on('click', () => this.onSoundClick())
    this.buttonExpand.on('click', () => this.onExpandClick())

    this.updateEmulatorStatus()
  }

  updateEmulatorStatus() {
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

  onControlClick() {
    const emulator = this.emulatorView.emulator
    if (emulator?.running) {
      emulator.pause()
    } else {
      emulator?.start()
    }
    this.updateEmulatorStatus()

    // if (this.buttonControl) {
    //   $('span:first', this.buttonControl).toggleClass(
    //     'codicon-debug-start codicon-debug-pause',
    //   )
    // }
  }
  onRestartClick() {
    if (this.buttonRestart) {
      this.emulatorView.emulator?.cpu.reset(true)
      // $('span:first', this.buttonRestart).toggleClass(
      //   'codicon-debug-start codicon-debug-pause',
      // )
    }
  }
  onSoundClick() {
    if (this.buttonSound) {
      $('span:first', this.buttonSound).toggleClass(
        'codicon-mute codicon-unmute',
      )
    }
  }
  onExpandClick() {
    if (this.buttonExpand) {
      $('span:first', this.buttonExpand).toggleClass(
        'codicon-screen-normal codicon-screen-full',
      )
    }
  }
}
