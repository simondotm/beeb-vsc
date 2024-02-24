declare module 'jsbeeb/video' {
  import type { Teletext } from 'jsbeeb/teletext'

  export const enum VideoDisplayFlags {
    VDISPENABLE = 1 << 0,
    HDISPENABLE = 1 << 1,
    SKEWDISPENABLE = 1 << 2,
    SCANLINEDISPENABLE = 1 << 3,
    USERDISPENABLE = 1 << 4,
    FRAMESKIPENABLE = 1 << 5,
    EVERYTHINGENABLED = VDISPENABLE |
      HDISPENABLE |
      SKEWDISPENABLE |
      SCANLINEDISPENABLE |
      USERDISPENABLE |
      FRAMESKIPENABLE,
  }

  export class Video {
    constructor(
      isMaster: boolean,
      fb32_param: Uint32Array,
      paint_ext_param: any,
    )

    isMaster: boolean
    fb32: Uint32Array
    collook: Uint32Array
    screenAddrAdd: Uint16Array
    cursorTable: Uint8Array
    cursorFlashMask: Uint8Array
    regs: Uint8Array // 32
    bitmapX: number
    bitmapY: number
    oddClock: boolean
    frameCount: number
    doEvenFrameLogic: boolean
    isEvenRender: boolean
    lastRenderWasEven: boolean
    firstScanline: boolean
    inHSync: boolean
    inVSync: boolean
    hadVSyncThisRow: boolean
    checkVertAdjust: boolean
    endOfMainLatched: boolean
    endOfVertAdjustLatched: boolean
    endOfFrameLatched: boolean
    inVertAdjust: boolean
    inDummyRaster: boolean
    hpulseWidth: number
    vpulseWidth: number
    hpulseCounter: number
    vpulseCounter: number
    dispEnabled: VideoDisplayFlags
    horizCounter: number
    vertCounter: number
    scanlineCounter: number
    vertAdjustCounter: number
    addr: number
    lineStartAddr: number
    nextLineStartAddr: number
    ulactrl: number
    pixelsPerChar: number
    halfClock: boolean
    ulaMode: number
    teletextMode: boolean
    displayEnableSkew: number
    ulaPal: Uint32Array
    actualPal: Uint8Array
    teletext: Teletext
    cursorOn: boolean
    cursorOff: boolean
    cursorOnThisFrame: boolean
    cursorDrawIndex: number
    cursorPos: number
    interlacedSyncAndVideo: boolean
    doubledScanlines: boolean
    frameSkipCount: number

    topBorder: number
    bottomBorder: number
    leftBorder: number
    rightBorder: number

    paint_ext: any
  }
}
