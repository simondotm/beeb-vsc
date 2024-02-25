import _ from 'underscore'
import { Cpu6502 } from 'jsbeeb/6502'
import { Video } from 'jsbeeb/video'
import { Debugger } from 'jsbeeb/web/debug'
import { SoundChip, FakeSoundChip } from 'jsbeeb/soundchip'
import { DdNoise, FakeDdNoise } from 'jsbeeb/ddnoise'
import { Cmos, CmosData } from 'jsbeeb/cmos'
import { Canvas, GlCanvas } from 'jsbeeb/canvas'
import Snapshot from './snapshot'
import * as utils from 'jsbeeb/utils'
import { Model } from 'jsbeeb/models'
import { BaseDisc, emptySsd } from 'jsbeeb/fdc'
import { notifyHost } from './vscode'
import { ClientCommand } from '../types/shared/messages'

const ClocksPerSecond = (2 * 1000 * 1000) | 0
const BotStartCycles = 725000 // bbcmicrobot start time
const MaxCyclesPerFrame = ClocksPerSecond / 10
const urlParams = new URLSearchParams(window.location.search)

export type EmulatorCanvas = Canvas | GlCanvas

// patch the jsbeeb loader to use the resource urls from the webview
utils.setLoader((url: string) => {
  const newUrl = window.JSBEEB_RESOURCES[url]
  console.log('Loading ' + url + ' as ' + newUrl)
  return utils.defaultLoadData(newUrl)
})

export class Emulator {
  canvas: EmulatorCanvas
  frames: number
  frameSkip: number
  // resizer: ScreenResizer;
  leftMargin: number
  rightMargin: number
  topMargin: number
  bottomMargin: number
  loopEnabled: boolean
  loopStart: number
  loopLength: number
  state: any
  snapshot: Snapshot
  loop: boolean
  video: Video
  soundChip: SoundChip | FakeSoundChip
  ddNoise: DdNoise | FakeDdNoise
  dbgr: Debugger
  cpu: Cpu6502
  ready: boolean
  lastFrameTime: number
  onAnimFrame: FrameRequestCallback
  running: boolean = false
  lastShiftLocation: number
  lastAltLocation: number
  lastCtrlLocation: number

  constructor(canvas: EmulatorCanvas, model: Model) {
    this.canvas = canvas
    this.frames = 0
    this.frameSkip = 0
    // resizer not great in webview
    // this.resizer = new ScreenResizer(screen);
    // margin sets how much of the fully emulated screen is visible/cropped
    this.leftMargin = 115
    this.rightMargin = 130
    this.topMargin = 45
    this.bottomMargin = 30
    // this.leftMargin = 0;
    // this.rightMargin = 0;
    // this.topMargin = 0;
    // this.bottomMargin = 0;

    this.loopEnabled = true
    this.loopStart = 60680000
    this.loopLength = 6000000 + 320000
    this.state = null
    this.snapshot = new Snapshot()
    this.loop = urlParams.get('loop') ? true : false

    this.video = new Video(
      model.isMaster,
      this.canvas.fb32,
      _.bind(this.paint, this),
    )

    this.soundChip = new FakeSoundChip()
    this.ddNoise = new FakeDdNoise()

    this.dbgr = new Debugger(this.video)
    const cmos = new Cmos({
      load: function () {
        if (window.localStorage.cmosRam) {
          return JSON.parse(window.localStorage.cmosRam)
        }
        return null
      },
      save: function (data: CmosData) {
        window.localStorage.cmosRam = JSON.stringify(data)
      },
    })
    const config = {}
    this.cpu = new Cpu6502(
      model,
      this.dbgr,
      this.video,
      this.soundChip,
      this.ddNoise,
      undefined, // music5000
      cmos,
      config,
      undefined, // econet
    )

    // Patch this version of JSbeeb to stop it reseting cycle count.
    // Number.MAX_SAFE_INTEGER should gives us plenty of headroom
    this.cpu.execute = function (numCyclesToRun: number) {
      this.halted = false
      this.targetCycles += numCyclesToRun
      return this.executeInternalFast()
    }

    this.lastFrameTime = 0
    this.onAnimFrame = _.bind(this.frameFunc, this)
    this.ready = false

    this.lastShiftLocation = this.lastAltLocation = this.lastCtrlLocation = 0
  }

  async initialise() {
    await Promise.all([this.cpu.initialise(), this.ddNoise.initialise()])
    this.ready = true
  }

  // gxr(){
  // 	model.os.push('gxr.rom');
  // 	modelName += ' | GXR';
  // }

  start() {
    if (this.running) return
    this.running = true
    window.requestAnimationFrame(this.onAnimFrame)
  }

  pause() {
    this.running = false
  }

  async loadDisc(discUrl: string | null | undefined) {
    if (!this.ready) {
      console.log('Emulator not ready to load disc yet.')
      return
    }
    try {
      if (discUrl) {
        console.log('loading disc')
        const fdc = this.cpu.fdc
        const discData = await utils.defaultLoadData(discUrl)
        const discImage = new BaseDisc(fdc, 'disc', discData, () => {})
        this.cpu.fdc.loadDisc(0, discImage)
      } else {
        console.log('ejecting disc')
        emptySsd(this.cpu.fdc)
      }
    } catch (e: any) {
      console.error('Failed to load disc', e)
      notifyHost({ command: ClientCommand.Error, text: e.message })
    }
  }

  getScreenMode() {
    return this.cpu.readmem(0x0355)
  }

  async runProgram(tokenised: any) {
    if (!this.ready) return
    console.log(this.cpu.currentCycles)
    this.cpu.reset(true)
    const processor = this.cpu
    await processor.execute(BotStartCycles) // match bbcmicrobot
    const page = processor.readmem(0x18) << 8
    for (let i = 0; i < tokenised.length; ++i) {
      processor.writemem(page + i, tokenised.charCodeAt(i))
    }
    // Set VARTOP (0x12/3) and TOP(0x02/3)
    const end = page + tokenised.length
    const endLow = end & 0xff
    const endHigh = (end >>> 8) & 0xff
    processor.writemem(0x02, endLow)
    processor.writemem(0x03, endHigh)
    processor.writemem(0x12, endLow)
    processor.writemem(0x13, endHigh)
    this.writeToKeyboardBuffer('RUN\r')
    this.start()
  }

  writeToKeyboardBuffer(text: any) {
    const processor = this.cpu
    const keyboardBuffer = 0x0300 // BBC Micro OS 1.20
    const IBPaddress = 0x02e1 // input buffer pointer
    let inputBufferPointer = processor.readmem(IBPaddress)
    for (let a = 0; a < text.length; a++) {
      processor.writemem(
        keyboardBuffer + inputBufferPointer,
        text.charCodeAt(a),
      )
      inputBufferPointer++
      if (inputBufferPointer > 0xff) {
        inputBufferPointer = 0xe0
      }
    }
    processor.writemem(IBPaddress, inputBufferPointer)
  }

  frameFunc(now: number) {
    window.requestAnimationFrame(this.onAnimFrame)
    // Take snapshot
    if (
      this.loop == true &&
      this.state == null &&
      this.cpu.currentCycles >= this.loopStart
    ) {
      this.pause()
      this.state = this.snapshot.save(this.cpu).state
      this.start()
      console.log('snapshot taken at ' + this.cpu.currentCycles + ' cycles')
    }

    // Loop back
    if (
      this.loop == true &&
      this.state !== null &&
      this.cpu.currentCycles >= this.loopStart + this.loopLength
    ) {
      this.pause()
      this.snapshot.load(this.state, this.cpu)
      this.cpu.currentCycles = this.loopStart
      this.cpu.targetCycles = this.loopStart
      this.start()
    }

    if (this.running && this.lastFrameTime !== 0) {
      const sinceLast = now - this.lastFrameTime
      let cycles = ((sinceLast * ClocksPerSecond) / 1000) | 0
      cycles = Math.min(cycles, MaxCyclesPerFrame)
      try {
        if (!this.cpu.execute(cycles)) {
          this.running = false // TODO: breakpoint
        }
      } catch (e) {
        this.running = false
        this.dbgr.debug(this.cpu.pc)
        throw e
      }
    }
    this.lastFrameTime = now
  }

  paint(minx: number, miny: number, maxx: number, maxy: number) {
    this.frames++
    if (this.frames < this.frameSkip) return
    this.frames = 0
    const teletextAdjustX = this.video && this.video.teletextMode ? 15 : 0
    this.canvas.paint(
      minx + this.leftMargin + teletextAdjustX,
      miny + this.topMargin,
      maxx - this.rightMargin + teletextAdjustX,
      maxy - this.bottomMargin,
    )
  }

  keyDown(event: any) {
    if (!this.running) return

    const code = this.keyCode(event)
    const processor = this.cpu
    if (code === utils.keyCodes.HOME && event.ctrlKey) {
      this.pause()
    } else if (code === utils.keyCodes.F12 || code === utils.keyCodes.BREAK) {
      processor.setReset(true)
    } else {
      processor.sysvia.keyDown(code, event.shiftKey)
    }
    event.preventDefault()
  }

  clearKeys() {
    const processor = this.cpu
    if (processor && processor.sysvia) processor.sysvia.clearKeys()
  }

  keyUp(event: any) {
    // Always let the key ups come through.
    const code = this.keyCode(event)
    const processor = this.cpu
    if (processor && processor.sysvia) processor.sysvia.keyUp(code)
    if (!this.running) return
    if (code === utils.keyCodes.F12 || code === utils.keyCodes.BREAK) {
      processor.setReset(false)
    }
    event.preventDefault()
  }

  keyCode(event: any) {
    const ret = event.which || event.charCode || event.keyCode
    const keyCodes = utils.keyCodes
    switch (event.location) {
      default:
        // keyUp events seem to pass location = 0 (Chrome)
        switch (ret) {
          case keyCodes.SHIFT:
            return this.lastShiftLocation === 1
              ? keyCodes.SHIFT_LEFT
              : keyCodes.SHIFT_RIGHT
          case keyCodes.ALT:
            return this.lastAltLocation === 1
              ? keyCodes.ALT_LEFT
              : keyCodes.ALT_RIGHT
          case keyCodes.CTRL:
            return this.lastCtrlLocation === 1
              ? keyCodes.CTRL_LEFT
              : keyCodes.CTRL_RIGHT
        }
        break
      case 1:
        switch (ret) {
          case keyCodes.SHIFT:
            this.lastShiftLocation = 1
            return keyCodes.SHIFT_LEFT

          case keyCodes.ALT:
            this.lastAltLocation = 1
            return keyCodes.ALT_LEFT

          case keyCodes.CTRL:
            this.lastCtrlLocation = 1
            return keyCodes.CTRL_LEFT
        }
        break
      case 2:
        switch (ret) {
          case keyCodes.SHIFT:
            this.lastShiftLocation = 2
            return keyCodes.SHIFT_RIGHT

          case keyCodes.ALT:
            this.lastAltLocation = 2
            return keyCodes.ALT_RIGHT

          case keyCodes.CTRL:
            this.lastCtrlLocation = 2
            return keyCodes.CTRL_RIGHT
        }
        break
      case 3: // numpad
        switch (ret) {
          case keyCodes.ENTER:
            return utils.keyCodes.NUMPADENTER

          case keyCodes.DELETE:
            return utils.keyCodes.NUMPAD_DECIMAL_POINT
        }
        break
    }

    return ret
  }
}