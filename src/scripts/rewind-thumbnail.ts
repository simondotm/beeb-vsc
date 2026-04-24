const THUMBNAIL_WIDTH = 160
const THUMBNAIL_HEIGHT = 128
const FRAMEBUFFER_WIDTH = 1024
const FRAMEBUFFER_HEIGHT = 625
const VISIBLE_PIXELS = FRAMEBUFFER_WIDTH * FRAMEBUFFER_HEIGHT
const CYCLES_PER_CHUNK = 8000
const MAX_CHUNKS = 100

let sourceCanvas: HTMLCanvasElement | null = null
let sourceContext: CanvasRenderingContext2D | null = null
let sourceImageData: ImageData | null = null

function ensureSourceCanvas() {
  if (sourceCanvas && sourceContext && sourceImageData) {
    return
  }

  sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = FRAMEBUFFER_WIDTH
  sourceCanvas.height = FRAMEBUFFER_HEIGHT
  sourceContext = sourceCanvas.getContext('2d', { alpha: false })
  if (!sourceContext) {
    throw new Error('Unable to create rewind thumbnail canvas context')
  }
  sourceImageData = sourceContext.createImageData(
    FRAMEBUFFER_WIDTH,
    FRAMEBUFFER_HEIGHT,
  )
}

function captureThumbnail(framebuffer: Uint32Array): HTMLCanvasElement {
  ensureSourceCanvas()

  new Uint32Array(sourceImageData!.data.buffer).set(
    framebuffer.subarray(0, VISIBLE_PIXELS),
  )
  sourceContext!.putImageData(sourceImageData!, 0, 0)

  const thumbnail = document.createElement('canvas')
  thumbnail.width = THUMBNAIL_WIDTH
  thumbnail.height = THUMBNAIL_HEIGHT

  const thumbnailContext = thumbnail.getContext('2d', { alpha: false })
  if (!thumbnailContext) {
    throw new Error('Unable to create rewind thumbnail context')
  }

  thumbnailContext.drawImage(
    sourceCanvas!,
    0,
    0,
    FRAMEBUFFER_WIDTH,
    FRAMEBUFFER_HEIGHT,
    0,
    0,
    THUMBNAIL_WIDTH,
    THUMBNAIL_HEIGHT,
  )

  return thumbnail
}

export function executeUntilFrame(processor: any, video: any) {
  const startFrame = video.frameCount

  for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
    if (processor.execute(CYCLES_PER_CHUNK) === false) {
      break
    }

    if (video.frameCount !== startFrame) {
      break
    }
  }

  const secondFrame = video.frameCount
  const originalClearPaintBuffer = video.clearPaintBuffer
  video.clearPaintBuffer = function () {}

  try {
    for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
      if (processor.execute(CYCLES_PER_CHUNK) === false) {
        return
      }

      if (video.frameCount !== secondFrame) {
        return
      }
    }
  } finally {
    video.clearPaintBuffer = originalClearPaintBuffer
  }
}

export type RewindThumbnail = {
  canvas: HTMLCanvasElement
  index: number
  ageSeconds: number
}

export function renderThumbnails(
  processor: any,
  snapshots: unknown[],
  video: any,
  captureInterval: number,
  savedState?: unknown,
): RewindThumbnail[] {
  if (snapshots.length === 0) {
    return []
  }

  const originalState = savedState ?? processor.snapshotState()
  const results: RewindThumbnail[] = []

  try {
    for (let index = 0; index < snapshots.length; index++) {
      processor.restoreState(snapshots[index])
      executeUntilFrame(processor, video)
      results.push({
        canvas: captureThumbnail(video.fb32 as Uint32Array),
        index,
        ageSeconds: Math.round(((snapshots.length - 1 - index) * captureInterval) / 50),
      })
    }
  } finally {
    processor.restoreState(originalState)
  }

  return results
}