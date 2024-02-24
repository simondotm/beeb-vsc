declare module 'jsbeeb/cmos' {
  export type CmosData = Uint8Array // 48 bytes of CMOS data
  export type CmosIO = {
    load: () => CmosData | null
    save: (data: CmosData) => void
  }
  export class Cmos {
    constructor(persistence?: CmosIO)

    read(IC32: number): number
    writeControl(portbpins: number, portapins: number, IC32: number): void
  }
}
