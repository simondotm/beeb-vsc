declare module 'jsbeeb/web/debug' {
  import type { Video } from 'jsbeeb/video'
  export class Debugger {
    constructor(video: Video)
    debug(where: number): void
    step(): void
    stepOver(): void
    stepOut(): void
    enable(e: boolean): void
    toggleBreakpoint(address: number): void
    readBreakpoints: { [address: number]: { remove(): void } | undefined }
    writeBreakpoints: { [address: number]: { remove(): void } | undefined }
    toggleReadBreakpoint: (address: number) => void
    toggleWriteBreakpoint: (address: number) => void
  }
}
