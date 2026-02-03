declare module 'jsbeeb/fdc' {
  import type { Cpu6502 } from 'jsbeeb/6502'
  import type { DdNoise } from 'jsbeeb/ddnoise'
  import type { Disc } from 'jsbeeb/disc'

  export type Fdc = I8271 | WD1770

  export class BaseFdc {
    motorOn: boolean[] // drive 0 and 1
    constructor(cpu: Cpu6502, scheduler: any, drives?: any, debugFlags?: any)
    loadDisc(drive: number, disc: Disc): void
  }

  export class I8271 extends BaseFdc {
    constructor(cpu: Cpu6502, ddNoise: DdNoise, scheduler: any, debugFlags?: any)
  }
  export class WD1770 extends BaseFdc {
    constructor(cpu: Cpu6502, ddNoise: DdNoise, scheduler: any, debugFlags?: any)
  }

  export function load(name: string): Promise<any>
  export function localDisc(fdc: Fdc, name: string): Disc
  export function discFor(
    fdc: Fdc,
    name: string,
    stringData: string | Uint8Array,
    onChange: (data: Uint8Array) => void,
  ): Disc
}
