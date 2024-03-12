declare module 'jsbeeb/acia' {
  import { Cpu6502 } from 'jsbeeb/6502'

  export class Acia {
    motorOn: boolean

    constructor(
      cpu: Cpu6502,
      toneGenerator: any,
      scheduler: any,
      touchScreen: any,
    )
  }
}
