declare module 'jsbeeb/web/audio-handler' {
  export class AudioHandler {
    soundChip: any
    ddNoise: any
    music5000: any

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
