declare module 'jsbeeb/fdc' {
  import { Cpu6502 } from 'jsbeeb/6502'
  import { DdNoise } from 'jsbeeb/ddnoise'
  import { Scheduler } from 'jsbeeb/scheduler'
  import { Disc } from 'jsbeeb/disc'

  export type Fdc = IntelFdc | WdFdc | NoiseAwareIntelFdc | NoiseAwareWdFdc

  export class IntelFdc {
    constructor(
      cpu: Cpu6502,
      ddNoise: DdNoise,
      scheduler: Scheduler,
      debugFlags?: any,
    )
    loadDisc(drive: number, disc: Disc): void
  }

  export class WdFdc {
    constructor(
      cpu: Cpu6502,
      ddNoise: DdNoise,
      scheduler: Scheduler,
      debugFlags?: any,
    )
    loadDisc(drive: number, disc: Disc): void
  }

  export class NoiseAwareIntelFdc {
    constructor(
      cpu: Cpu6502,
      ddNoise: DdNoise,
      scheduler: Scheduler,
      debugFlags?: any,
    )
    loadDisc(drive: number, disc: Disc): void
  }

  export class NoiseAwareWdFdc {
    constructor(
      cpu: Cpu6502,
      ddNoise: DdNoise,
      scheduler: Scheduler,
      debugFlags?: any,
    )
    loadDisc(drive: number, disc: Disc): void
  }

  export function load(name: string): Promise<Uint8Array>
  export function localDisc(fdc: Fdc, name: string): Disc
  export function discFor(
    fdc: Fdc,
    name: string,
    stringData: string | Uint8Array,
    onChange: (data: Uint8Array) => void,
  ): Disc
}
