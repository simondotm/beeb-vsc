declare module 'jsbeeb/fdc' {
  import type { Cpu6502 } from 'jsbeeb/6502'
  import type { DdNoise } from 'jsbeeb/ddnoise'

  export type Fdc = I8271 | WD1770
  export interface DiscState {
    notFound: number
    seek: () => number
    read: () => any
    write: () => any
    address: () => any
    format: () => any
    notFoundTask: any // scheduler function
  } // This is actually a BaseDisc but with the interface hard coded to return empty disc results. Needs fixing

  export class BaseFdc {
    motorOn: boolean[] // drive 0 and 1
    constructor(cpu: Cpu6502, noise: DdNoise, scheduler: any)
    loadDisc(drive: number, disc: BaseDisc): void
  }

  export class I8271 extends BaseFdc {
    // constructor(cpu: Cpu6502, noise: DdNoise, scheduler: any)
    // loadDisc(drive: number, disc: BaseDisc): void
  }
  export class WD1770 extends BaseFdc {
    // constructor(cpu: Cpu6502, noise: DdNoise, scheduler: any)
    // loadDisc(drive: number, disc: BaseDisc): void
  }

  export class BaseDisc {
    constructor(fdc: Fdc, name: string, data: Uint8Array, flusher: () => void)
  }

  export function load(name: string): Promise<any>
  export function localDisc(fdc: Fdc, name: string): BaseDisc
  export function emptySsd(fdc: Fdc): DiscState
  export function discFor(
    fdc: Fdc,
    name: string,
    stringData: string | Uint8Array,
    onChange: (data: Uint8Array) => void,
  ): BaseDisc
}
