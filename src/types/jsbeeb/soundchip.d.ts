declare module 'jsbeeb/soundchip' {
  import { Scheduler } from 'jsbeeb/scheduler'
  import { ToneGenerator } from 'jsbeeb/acia'

  export class SoundChip {
    toneGenerator: ToneGenerator
    constructor(onBuffer: (buffer: Float32Array) => void)
    setScheduler(scheduler_: Scheduler): void
    poke(value: number): void
    updateSlowDataBus(slowDataBus: number, active: boolean): void
    reset(hard: boolean): void
    mute(): void
    unmute(): void
  }

  export class FakeSoundChip {
    constructor()
    reset(hard?: boolean): void
    enable(e: boolean): void
    mute(): void
    unmute(): void
  }
}
