declare module 'jsbeeb/6502.opcodes' {
  export class Disassemble6502 {
    constructor(cpu: Cpu6502, opcodes: object)
    disassemble(
      addr: number,
      plain: boolean = false,
    ): [string, number, number | undefined]
  }
}
