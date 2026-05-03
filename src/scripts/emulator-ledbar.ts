import { Emulator } from './emulator'
import { EmulatorView } from './emulator-view'

class LedIcon {
  private isOn = false
  private parent: HTMLElement
  private images: HTMLImageElement[]

  constructor(private id: string) {
    const parent = document.querySelector<HTMLElement>(id)
    if (!parent) {
      throw new Error(`LedIcon '${id}' not found`)
    }

    this.parent = parent
    this.images = Array.from(this.parent.querySelectorAll('img'))
    if (this.images.length < 2) {
      throw new Error(`LedIcon '${id}' img not found`)
    }
  }

  on() {
    if (!this.isOn) {
      this.setImageState(true)
      this.isOn = true
    }
  }

  off() {
    if (this.isOn) {
      this.setImageState(false)
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

  private setImageState(isOn: boolean) {
    const [onImage, offImage] = this.images
    onImage.hidden = !isOn
    offImage.hidden = isOn
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
