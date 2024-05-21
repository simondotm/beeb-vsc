declare module 'jsbeeb/web/debug' {
  import type { Video } from 'jsbeeb/video'
  export class Debugger {
    constructor(video: Video)
    debug(where: number): void
    step(): void
    stepOver(): void
    stepOut(): void
    enable(e: boolean): void
  }
}
