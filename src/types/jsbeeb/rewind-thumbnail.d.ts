declare module 'jsbeeb/rewind-thumbnail' {
  import { Cpu6502 } from 'jsbeeb/6502'
  import { Video } from 'jsbeeb/video'

  export type RewindThumbnail = {
    canvas: HTMLCanvasElement
    index: number
    ageSeconds: number
  }

  export function executeUntilFrame(processor: Cpu6502, video: Video): void

  export function renderThumbnails(
    processor: Cpu6502,
    snapshots: unknown[],
    video: Video,
    captureInterval: number,
    savedState?: unknown,
  ): RewindThumbnail[]
}
