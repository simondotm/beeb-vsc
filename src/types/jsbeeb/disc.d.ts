declare module 'jsbeeb/disc' {
  export class DiscConfig {
    logProtection: boolean
    logIffyPulses: boolean
    expandTo80: boolean
    isQuantizeFm: boolean
    isSkipOddTracks: boolean
    isSkipUpperSide: boolean
    rev: number
    revSpec: string
    constructor()
  }

  export class Disc {
    config: DiscConfig
    name: string
    isDirty: boolean
    tracksUsed: number
    isDoubleSided: boolean
    isWriteable: boolean

    static createBlank(): Disc

    constructor(isWriteable: boolean, config: DiscConfig, name?: string)

    get writeProtected(): boolean
    initSurface(initialByte: number): void
    readPulses(isSideUpper: boolean, track: number, position: number): number
    writePulses(
      isSideUpper: boolean,
      track: number,
      position: number,
      pulses: number,
    ): void
  }

  export function loadSsd(
    disc: Disc,
    data: Uint8Array,
    isDsd: boolean,
    onChange?: (data: Uint8Array) => void,
  ): Disc
  export function loadAdf(disc: Disc, data: Uint8Array, isDsd: boolean): Disc
  export function toSsdOrDsd(disc: Disc): Uint8Array
}
