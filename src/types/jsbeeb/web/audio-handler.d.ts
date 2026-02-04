declare module 'jsbeeb/web/audio-handler' {
  import type { DdNoise, FakeDdNoise } from 'jsbeeb/ddnoise'
  import type { FakeSoundChip, SoundChip } from 'jsbeeb/soundchip'
  export class AudioHandler {
    soundChip: SoundChip | FakeSoundChip
    ddNoise: DdNoise | FakeDdNoise
    music5000: any // Keeping as 'any' as per the provided 'Code Edit' snippet, despite the instruction to type it.

    audioContext: AudioContext | webkitAudioContext | null

    constructor(
      warningNode: any, // Changed from JQuery<HTMLElement> to any as per 'Code Edit'
      statsNode: HTMLElement, // Changed from any to HTMLElement as per 'Code Edit'
      audioFilterFreq: number,
      audioFilterQ: number,
      noSeek: boolean,
    )

    async tryResume(): Promise<void>
    checkStatus(): void
    async initialise(): Promise<void> // Added return type Promise<void> as per 'Code Edit'
    mute(): void
    unmute(): void
  }
}
