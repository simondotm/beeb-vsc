declare module 'jsbeeb/web/audio-handler' {
  import type { DdNoise, FakeDdNoise } from 'jsbeeb/ddnoise'
  import type { FakeSoundChip, SoundChip } from 'jsbeeb/soundchip'
  export class AudioHandler {
    soundChip: SoundChip | FakeSoundChip
    ddNoise: DdNoise | FakeDdNoise
    music5000: any

    audioContext: AudioContext | webkitAudioContext | null

    constructor(
      warningNode: JQuery<HTMLElement>,
      audioFilterFreq: number,
      audioFilterQ: number,
      noSeek: boolean,
    )

    async tryResume(): Promise<void>
    checkStatus(): void
    async initialise()
    mute(): void
    unmute(): void
  }
}
