declare module 'jsbeeb/ddnoise' {
  export class DdNoise {
    constructor(context: AudioContext)

    initialise(): Promise<void>
    oneShot(sound: AudioBuffer): number
    play(sound: AudioBuffer, loop: boolean): Promise<any>
    spinUp(): void
    spinDown(): void
    seek(diff: number): number
    mute(): void
    unmute(): void
  }

  export class FakeDdNoise {
    constructor()
    seek(): number
    initialise(): Promise<void>
    spinUp(): void
    spinDown(): void
    mute(): void
    unmute(): void
  }
}
