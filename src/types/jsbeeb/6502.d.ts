declare module 'jsbeeb/6502' {
  import type { Cmos } from 'jsbeeb/cmos'
  import type { DdNoise, FakeDdNoise } from 'jsbeeb/ddnoise'
  import type { Debugger } from 'jsbeeb/web/debug'
  import type { FakeSoundChip, SoundChip } from 'jsbeeb/soundchip'
  import type { Video } from 'jsbeeb/video'
  import type { Disassemble6502 } from 'jsbeeb/6502.opcodes'

  export class Flags {
    c: boolean
    z: boolean
    i: boolean
    d: boolean
    v: boolean
    n: boolean
    constructor()
    reset(): void
    debugString(): string
    asByte(): number
  }

  export interface DebugHookHandler {
    (address: number): boolean
  }

  export interface DebugHookHandlerOutput extends DebugHookHandler {
    remove: () => void
  }

  export class DebugHook {
    constructor(cpu: Cpu6502, functionName: string)
    add(handler: DebugHookHandler): DebugHookHandlerOutput
    remove(handler: DebugHookHandler): DebugHookHandlerOutput
  }

  export class Cpu6502 {
    halted: boolean
    nmi: boolean
    pc: number
    p: Flags
    a: number
    x: number
    y: number
    s: number
    forceTracing: boolean

    econet?: any
    acia: any
    scheduler: Scheduler
    adconverter: any
    sysvia: any
    uservia: any
    fdc: any
    tube: any
    video: any
    soundChip: any
    music5000: any
    ddNoise: any

    targetCycles: number
    currentCycles: number
    cycleSeconds: number

    debugInstruction: any
    debugRead: any
    debugWrite: any

    _debugInstruction: ((pc: number, opcode: number) => boolean) | null
    _debugRead: ((addr: number, val: number, offset: number) => void) | null
    _debugWrite: ((addr: number, val: number) => void) | null

    ramRomOs: Uint8Array //[4587520] // Not sure benefits to know the size

    disassembler: Disassemble6502

    constructor(
      model: any,
      dbgr: Debugger,
      video_: Video,
      soundChip_: SoundChip | FakeSoundChip,
      ddNoise_: DdNoise | FakeDdNoise,
      music5000_: any,
      cmos: Cmos,
      config: any,
      econet_: any,
    )

    initialise(): Promise<void>
    reset(hard: boolean): void
    execute(numCyclesToRun: number): boolean
    executeInternalFast(): boolean
    executeInternal(): boolean
    stop(): void
    readmem(addr: number): number
    peekmem(addr: number): number
    writemem(addr: number, b: number): void
    setReset(resetOn: boolean): void
  }
}
