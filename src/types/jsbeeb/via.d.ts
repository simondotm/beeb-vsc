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
  // Base Via class (inferred from SysVia extends Via)
  export class Via {
    // Assuming some base methods/properties if SysVia extends it
    // This is a placeholder as the base class definition was not provided
    // but is implied by `SysVia extends Via`
  }

  export class UserVia extends Via {
    // Changed to extend Via
    constructor(
      cpu: Cpu6502,
      scheduler: Scheduler,
      isMaster: boolean,
      userPortPeripheral: any,
    ) // Reverted to original constructor signature but with scheduler
    reset(): void // Added from snippet
    write(addr: number, val: number): void // Added from snippet
    read(addr: number): number // Added from snippet
    setca1(level: boolean): void // Added from snippet
    setca2(level: boolean): void // Added from snippet
    setcb1(level: boolean): void // Added from snippet
    setcb2(level: boolean): void // Added from snippet
  }

  export class SysVia extends Via {
    // Changed to extend Via
    capsLockLight: boolean
    shiftLockLight: boolean

    constructor(
      cpu: Cpu6502,
      scheduler: Scheduler, // Added scheduler
      video: Video, // Kept original type
      soundChip: SoundChip, // Kept original type
      cmos: Cmos, // Kept original type
      isMaster: boolean, // Corrected typo from isMaste
      initialLayout: any, // Kept 'any' as per snippet
      getGamepads: () => any, // Changed type as per snippet
    )
    setVBlankInt(level: boolean): void // Added from snippet
    keyUp(key: string): void // Changed key type from number to string
    keyDown(key: string, shiftDown: boolean): void // Changed key type from number to string
    clearKeys(): void

    keyDownRaw(colrow: [number, number]): void
    keyUpRaw(colrow: [number, number]): void
    keyToggleRaw(colrow: [number, number]): void

    hasAnyKeyDown(): boolean
    enableKeyboard(): void
    disableKeyboard(): void
  }
}
