declare module 'jsbeeb/canvas' {
  export class Canvas {
    fb32: Uint32Array
    constructor(canvas: any)
    paint(minx: number, miny: number, maxx: number, maxy: number): void
  }

  export class GlCanvas {
    fb32: Uint32Array
    constructor(canvas: any, filterClass: any)
    paint(minx: number, miny: number, maxx: number, maxy: number): void
  }

  export function getFilterForMode(mode: string): any
  export function bestCanvas(canvas: any, filterClass: any): Canvas | GlCanvas
}
