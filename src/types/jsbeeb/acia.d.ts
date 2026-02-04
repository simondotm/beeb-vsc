declare module 'jsbeeb/acia' {
  import { Cpu6502 } from 'jsbeeb/6502'
  import { Scheduler } from 'jsbeeb/scheduler'

  export interface ToneGenerator {
    mute(): void
    tone(freq: number): void
  }

  export interface Rs423Handler {
    onTransmit(val: number): void
    tryReceive(rts: boolean): number
  }

  export class Acia {
    motorOn: boolean

    constructor(
      cpu: Cpu6502,
      toneGenerator: ToneGenerator,
      scheduler: Scheduler,
      rs423Handler: Rs423Handler,
    )
    read(addr: number): number
    write(addr: number, val: number): void
    tone(freq: number): void
    setMotor(on: boolean): void
    receive(byte: number): void
  }
}
