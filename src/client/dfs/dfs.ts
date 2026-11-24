// Acorn DFS catalogue parser for .ssd (single-sided) and .dsd (double-sided,
// track-interleaved) disk images.
//
// Catalogue layout (sectors 0 and 1 of each side):
//   sector 0, &00-&07  first 8 characters of the disc title
//   sector 0, &08+8n   file name (7 bytes) and directory (bit 7 = locked)
//   sector 1, &00-&03  last 4 characters of the disc title
//   sector 1, &04      cycle number (BCD)
//   sector 1, &05      number of catalogue entries * 8
//   sector 1, &06      bits 4-5 boot option, bits 0-1 sector count bits 8-9
//   sector 1, &07      sector count bits 0-7
//   sector 1, &08+8n   load (2), exec (2), length (2), packed high bits, start sector
//     packed byte: bits 0-1 start sector bits 8-9, bits 2-3 load bits 16-17,
//                  bits 4-5 length bits 16-17, bits 6-7 exec bits 16-17

export const SECTOR_SIZE = 256
export const SECTORS_PER_TRACK = 10
export const TRACK_SIZE = SECTOR_SIZE * SECTORS_PER_TRACK

const CATALOGUE_SIZE = SECTOR_SIZE * 2
const ENTRY_SIZE = 8

export const BOOT_OPTIONS = ['None', 'Load', 'Run', 'Exec']

export interface DfsFile {
  name: string
  directory: string
  locked: boolean
  // 18-bit addresses as stored; high bits %11 conventionally mean the I/O
  // processor (&FFxxxx)
  loadAddress: number
  execAddress: number
  length: number
  startSector: number
  // byte offset of the file data within the side
  offset: number
  // true when the catalogue says the file extends beyond the image data
  truncated: boolean
}

export interface DfsSide {
  // drive number of this side: 0 for side one, 2 for side two
  drive: number
  title: string
  cycle: number
  bootOption: number
  // disc size declared by the catalogue
  discSectors: number
  // sectors actually present in the image for this side
  imageSectors: number
  files: DfsFile[]
  // the side's raw bytes (sector 0 at offset 0)
  data: Uint8Array
  warnings: string[]
}

export interface DfsImage {
  format: 'ssd' | 'dsd'
  sides: DfsSide[]
}

function decodeText(bytes: Uint8Array): string {
  let text = ''
  for (const byte of bytes) {
    const code = byte & 0x7f
    if (code === 0) {
      break
    }
    if (code < 0x20 || code === 0x7f) {
      text += ' '
    } else if (code === 0x60) {
      // the BBC Micro shows &60 as a pound sign
      text += '£'
    } else {
      text += String.fromCharCode(code)
    }
  }
  return text
}

function fromBcd(value: number): number {
  return (value >> 4) * 10 + (value & 0x0f)
}

export function parseDfsSide(data: Uint8Array, drive = 0): DfsSide {
  if (data.length < CATALOGUE_SIZE) {
    throw new Error(
      `The image is too small to contain an Acorn DFS catalogue (${data.length} bytes, need ${CATALOGUE_SIZE}).`,
    )
  }
  const sector1 = SECTOR_SIZE
  const entryBytes = data[sector1 + 5]
  if (entryBytes % ENTRY_SIZE !== 0) {
    throw new Error(
      `The catalogue declares an invalid file list size (${entryBytes}); this does not look like an Acorn DFS disk.`,
    )
  }

  const warnings: string[] = []
  if (data.length % SECTOR_SIZE !== 0) {
    warnings.push(
      'The image is not a whole number of 256-byte sectors; the last sector is incomplete.',
    )
  }

  const title = decodeText(
    new Uint8Array([
      ...data.subarray(0, 8),
      ...data.subarray(sector1, sector1 + 4),
    ]),
  ).trimEnd()
  const options = data[sector1 + 6]
  const discSectors = data[sector1 + 7] | ((options & 0x03) << 8)

  const files: DfsFile[] = []
  for (let index = 0; index < entryBytes / ENTRY_SIZE; index++) {
    const nameOffset = ENTRY_SIZE + index * ENTRY_SIZE
    const infoOffset = sector1 + ENTRY_SIZE + index * ENTRY_SIZE
    const directoryByte = data[nameOffset + 7]
    const packed = data[infoOffset + 6]

    const loadAddress =
      data[infoOffset] |
      (data[infoOffset + 1] << 8) |
      (((packed >> 2) & 0x03) << 16)
    const execAddress =
      data[infoOffset + 2] |
      (data[infoOffset + 3] << 8) |
      (((packed >> 6) & 0x03) << 16)
    const length =
      data[infoOffset + 4] |
      (data[infoOffset + 5] << 8) |
      (((packed >> 4) & 0x03) << 16)
    const startSector = data[infoOffset + 7] | ((packed & 0x03) << 8)
    const offset = startSector * SECTOR_SIZE

    files.push({
      name: decodeText(data.subarray(nameOffset, nameOffset + 7)).trimEnd(),
      directory: String.fromCharCode(directoryByte & 0x7f),
      locked: (directoryByte & 0x80) !== 0,
      loadAddress,
      execAddress,
      length,
      startSector,
      offset,
      truncated: offset + length > data.length,
    })
  }

  if (files.some((file) => file.truncated)) {
    warnings.push('Some files extend beyond the end of the image data.')
  }

  return {
    drive,
    title,
    cycle: fromBcd(data[sector1 + 4]),
    bootOption: (options >> 4) & 0x03,
    discSectors,
    imageSectors: Math.ceil(data.length / SECTOR_SIZE),
    files,
    data,
    warnings,
  }
}

// Split a .dsd image into its two sides. Tracks are interleaved:
// side 0 track 0, side 1 track 0, side 0 track 1, side 1 track 1, ...
export function splitDsd(data: Uint8Array): [Uint8Array, Uint8Array] {
  const parts: Uint8Array[][] = [[], []]
  for (let start = 0; start < data.length; start += TRACK_SIZE) {
    parts[(start / TRACK_SIZE) % 2].push(
      data.subarray(start, start + TRACK_SIZE),
    )
  }
  const join = (tracks: Uint8Array[]) => {
    const joined = new Uint8Array(
      tracks.reduce((total, track) => total + track.length, 0),
    )
    let position = 0
    for (const track of tracks) {
      joined.set(track, position)
      position += track.length
    }
    return joined
  }
  return [join(parts[0]), join(parts[1])]
}

export function parseDfsImage(data: Uint8Array, fileName: string): DfsImage {
  if (fileName.toLowerCase().endsWith('.dsd')) {
    const [side0, side2] = splitDsd(data)
    const sides = [parseDfsSide(side0, 0)]
    // a .dsd with an empty or missing second side is still readable
    if (side2.length >= CATALOGUE_SIZE) {
      sides.push(parseDfsSide(side2, 2))
    }
    return { format: 'dsd', sides }
  }
  return { format: 'ssd', sides: [parseDfsSide(data, 0)] }
}

// Format an 18-bit DFS address the way *INFO does: high bits %11 are shown
// as &FFxxxx (I/O processor), otherwise as a 6-digit hex number.
export function formatAddress(address: number): string {
  const value =
    (address & 0x30000) === 0x30000 ? 0xff0000 | (address & 0xffff) : address
  return value.toString(16).toUpperCase().padStart(6, '0')
}
