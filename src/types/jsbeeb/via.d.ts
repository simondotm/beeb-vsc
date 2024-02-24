declare module 'jsbeeb/via' {
  import type { Cpu6502 } from 'jsbeeb/6502'
  import type { Cmos } from 'jsbeeb/cmos'
  import type { SoundChip } from 'jsbeeb/soundchip'
  import type { Video } from 'jsbeeb/video'

  export const enum ViaRegisters {
    ORB = 0x0,
    ORA = 0x1,
    DDRB = 0x2,
    DDRA = 0x3,
    T1CL = 0x4,
    T1CH = 0x5,
    T1LL = 0x6,
    T1LH = 0x7,
    T2CL = 0x8,
    T2CH = 0x9,
    SR = 0xa,
    ACR = 0xb,
    PCR = 0xc,
    IFR = 0xd,
    IER = 0xe,
    ORAnh = 0xf,
  }
  export const enum ViaFlags {
    TIMER1INT = 0x40,
    TIMER2INT = 0x20,
    INT_CA1 = 0x02,
    INT_CA2 = 0x01,
    INT_CB1 = 0x10,
    INT_CB2 = 0x08,
  }
  export class UserVia {
    constructor(cpu: Cpu6502, isMaster: boolean, userPortPeripheral: any)
  }
  export class SysVia {
    constructor(
      cpu: Cpu6502,
      video: Video,
      soundChip: SoundChip,
      cmos: Cmos,
      isMaste: boolean,
      initialLayout: any,
      getGamepads: any,
    )
    keyUp(key: number): void
    keyDown(key: number, shiftDown: boolean): void
    clearKeys(): void
  }
}
