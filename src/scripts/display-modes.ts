export interface Resolution {
  w: number
  h: number
}
export interface DisplayModeInfo {
  text: Resolution
  pixels: Resolution | null
  type: 'Graphics' | 'Text'
  mode: number
  colours: number
  memory: number
  shadow?: boolean
}

export const DISPLAY_MODES: DisplayModeInfo[] = [
  {
    text: { w: 80, h: 32 },
    pixels: { w: 640, h: 256 },
    type: 'Graphics',
    mode: 0,
    colours: 2,
    memory: 20,
  },
  {
    text: { w: 40, h: 32 },
    pixels: { w: 320, h: 256 },
    type: 'Graphics',
    mode: 1,
    colours: 4,
    memory: 20,
  },
  {
    text: { w: 20, h: 32 },
    pixels: { w: 160, h: 256 },
    type: 'Graphics',
    mode: 2,
    colours: 8,
    memory: 20,
  },
  {
    text: { w: 80, h: 25 },
    pixels: { w: 640, h: 200 },
    type: 'Text',
    mode: 3,
    colours: 2,
    memory: 16,
  },
  {
    text: { w: 40, h: 32 },
    pixels: { w: 320, h: 256 },
    type: 'Graphics',
    mode: 4,
    colours: 2,
    memory: 10,
  },
  {
    text: { w: 20, h: 32 },
    pixels: { w: 160, h: 256 },
    type: 'Graphics',
    mode: 5,
    colours: 4,
    memory: 10,
  },
  {
    text: { w: 40, h: 25 },
    pixels: { w: 320, h: 200 },
    type: 'Text',
    mode: 6,
    colours: 2,
    memory: 8,
  },
  {
    text: { w: 40, h: 25 },
    pixels: { w: 480, h: 500 },
    type: 'Text',
    mode: 7,
    colours: 8,
    memory: 1,
  },
]

export function getDisplayModeInfo(mode: number): DisplayModeInfo | null {
  if (mode >= 0 && mode <= 7) {
    return DISPLAY_MODES[mode]
  }

  if (mode >= 128 && mode <= 135) {
    const modeInfo = DISPLAY_MODES[mode & 7]
    modeInfo.shadow = true
    return modeInfo
  }
  return null
}

export type DisplayMode = DisplayModeInfo | null
