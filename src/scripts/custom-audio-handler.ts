import { AudioHandler } from 'jsbeeb/web/audio-handler'

/**
 * CustomAudioHandler extends AudioHandler to add a couple of additional interfaces.
 */
export class CustomAudioHandler extends AudioHandler {
  muted: boolean = false

  constructor(
    warningNode: JQuery<HTMLElement>,
    audioFilterFreq: number,
    audioFilterQ: number,
    noSeek: boolean,
  ) {
    super(warningNode, audioFilterFreq, audioFilterQ, noSeek)
  }

  /**
   * Mute or unmute the audio at the sound chip level.
   */
  override mute() {
    this.muted = true
    super.mute()
  }

  override unmute() {
    this.muted = false
    super.unmute()
  }

  /**
   * Helper method
   * @returns true if the audio engine is enabled for the webview
   */
  isEnabled(): boolean {
    return this.audioContext && this.audioContext.state === 'running'
  }
}
