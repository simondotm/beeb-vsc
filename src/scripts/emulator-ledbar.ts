import $ from 'jquery'
import { Emulator } from './emulator'
import { EmulatorView } from './emulator-view'

class LedIcon {
  private isOn = false
  private parent: JQuery<HTMLElement>
  private img: JQuery<HTMLElement>

  constructor(private id: string) {
    this.parent = $(id)
    if (!this.parent) {
      throw new Error(`LedIcon '${id}' not found`)
    }
    this.img = this.parent.find('img')
    if (!this.img) {
      throw new Error(`LedIcon '${id}' img not found`)
    }
  }

  on() {
    if (this.parent && !this.isOn) {
      console.log('LedIcon.on', this.id)
      this.parent.find('img').toggle()
      this.isOn = true
    }
  }

  off() {
    if (this.parent && this.isOn) {
      console.log('LedIcon.off', this.id)
      this.parent.find('img').toggle()
      this.isOn = false
    }
  }

  set(state: boolean) {
    if (state) {
      this.on()
    } else {
      this.off()
    }
  }
}

export class EmulatorLedBar {
  capsLockLed: LedIcon
  shiftLockLed: LedIcon
  cassetteMotorLed: LedIcon
  drive0Led: LedIcon
  drive1Led: LedIcon
  econetLed: LedIcon

  constructor(public emulatorView: EmulatorView) {
    this.capsLockLed = new LedIcon('#led-caps-lock')
    this.shiftLockLed = new LedIcon('#led-shift-lock')
    this.cassetteMotorLed = new LedIcon('#led-cassette-motor')
    this.drive0Led = new LedIcon('#led-drive-0')
    this.drive1Led = new LedIcon('#led-drive-1')
    this.econetLed = new LedIcon('#led-econet')

    emulatorView.emulatorUpdate$.subscribe((emulator) =>
      this.updateLeds(emulator),
    )
  }

  updateLeds(emulator: Emulator) {
    const cpu = emulator.cpu
    const model = emulator.model
    this.capsLockLed.set(cpu.sysvia.capsLockLight)
    this.shiftLockLed.set(cpu.sysvia.shiftLockLight)
    this.cassetteMotorLed.set(cpu.acia.motorOn)
    this.drive0Led.set(cpu.fdc.motorOn[0])
    this.drive1Led.set(cpu.fdc.motorOn[1])
    this.econetLed.set(model.hasEconet ? cpu.econet?.activityLight() : false)
  }
}
