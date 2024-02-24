declare module 'jsbeeb/soundchip' {
  export class SoundChip {
    registers: [number, number, number, number]
    volume: number
    toneGenerator: {
      mute(): void
      tone(freq: number): void
    }
    constructor(sampleRate: number)

    reset(hard?: boolean): void
    enable(e: boolean): void
    mute(): void
    unmute(): void

    setScheduler(scheduler_: any): void
  }

  export class FakeSoundChip {
    constructor()
    reset(hard?: boolean): void
    enable(e: boolean): void
    mute(): void
    unmute(): void
  }
}
