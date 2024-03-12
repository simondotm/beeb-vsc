import { AudioHandler } from 'jsbeeb/web/audio-handler'
import { BehaviorSubject } from 'rxjs'

/**
 * CustomAudioHandler extends AudioHandler to add a couple of additional interfaces.
 */
export class CustomAudioHandler extends AudioHandler {
  muted$ = new BehaviorSubject<boolean>(true)
  enabled$ = new BehaviorSubject<boolean>(false)

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
    super.mute()
    this.muted$.next(true)
  }

  override unmute() {
    super.unmute()
    this.muted$.next(false)
  }

  override async tryResume() {
    await super.tryResume()
    this.updateState()
  }

  override checkStatus() {
    super.checkStatus()
    this.updateState()
  }

  private updateState() {
    const enabled = this.isEnabled()
    this.enabled$.next(enabled)
    this.muted$.next(!enabled)
  }

  /**
   * Helper method
   * @returns true if the audio engine is enabled for the webview
   */
  isEnabled(): boolean {
    return this.audioContext && this.audioContext.state === 'running'
  }

  isMuted(): boolean {
    return this.muted$.value
  }

  toggleMute(): boolean {
    if (this.muted$.value) {
      this.unmute()
    } else {
      this.mute()
    }
    return this.muted$.value
  }
}
