// Minimal Debugger class based on jsbeeb/src/web/debug.js. JSBeeb version is deeply tied to the DOM and tricky to integrate.
import type { Cpu6502 } from 'jsbeeb/6502'

type BreakpointHandle = { remove(): void }

export class Debugger {
  cpu: Cpu6502 | undefined
  breakpoints: { [address: number]: BreakpointHandle | undefined } = {}
  readBreakpoints: { [address: number]: BreakpointHandle | undefined } = {}
  writeBreakpoints: { [address: number]: BreakpointHandle | undefined } = {}
  toggleReadBreakpoint = (_address: number) => {}
  toggleWriteBreakpoint = (_address: number) => {}

  private _enabled = false

  constructor(private readonly video?: unknown) {}

  setCpu(cpu: Cpu6502) {
    this.cpu = cpu
  }

  debug(_where: number) {
    this.enable(true)
    ;(this.video as { debugPaint?(): void } | undefined)?.debugPaint?.()
  }

  enable(enabled: boolean) {
    this._enabled = enabled
  }

  step() {
    const cpu = this.requireCpu()
    const currentPc = cpu.pc
    this.stepUntil(() => cpu.pc !== currentPc)
  }

  stepOver() {
    const cpu = this.requireCpu()
    if (this.isUnconditionalJump(cpu.pc)) {
      this.step()
      return
    }

    const nextPc = this.nextInstruction(cpu.pc)
    this.stepUntil(() => cpu.pc === nextPc)
  }

  stepOut() {
    const cpu = this.requireCpu()
    const stackPointer = cpu.s
    this.stepUntil(() => {
      if (cpu.s >= stackPointer && this.isReturn(cpu.pc)) {
        const nextInstr = this.nextInstruction(cpu.pc)
        this.step()
        return cpu.pc !== nextInstr
      }

      return false
    })
  }

  toggleBreakpoint(address: number) {
    const cpu = this.requireCpu()
    if (this.breakpoints[address]) {
      this.breakpoints[address]?.remove()
      this.breakpoints[address] = undefined
      return
    }

    this.breakpoints[address] = cpu.debugInstruction.add(
      (currentAddress: number) => currentAddress === address,
    )
  }

  private stepUntil(stop: () => boolean) {
    const cpu = this.requireCpu()
    cpu.targetCycles = cpu.currentCycles
    for (let i = 0; i < 65536; i++) {
      cpu.execute(1)
      if (stop()) {
        break
      }
    }
    this.debug(cpu.pc)
  }

  private nextInstruction(address: number) {
    return this.disassemble(address)[1] & 0xffff
  }

  private isReturn(address: number) {
    return this.disassemble(address)[0] === 'RTS'
  }

  private isUnconditionalJump(address: number) {
    return /^(JMP|RTS|BRA)/.test(this.disassemble(address)[0])
  }

  private disassemble(address: number) {
    return this.requireCpu().disassembler.disassemble(address)
  }

  private requireCpu() {
    if (!this.cpu) {
      throw new Error('Debugger CPU not initialised')
    }

    return this.cpu
  }
}
