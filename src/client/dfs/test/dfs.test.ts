import * as assert from 'assert'
import {
  SECTOR_SIZE,
  TRACK_SIZE,
  formatAddress,
  parseDfsImage,
  parseDfsSide,
  splitDsd,
} from '../dfs'

interface TestFile {
  name: string
  directory: string
  locked?: boolean
  load: number
  exec: number
  data: Uint8Array
}

// Build a single-sided DFS image the way BeebAsm does: files packed from
// sector 2, each padded to a whole sector.
function makeSide(title: string, files: TestFile[], bootOption = 0) {
  const sectors =
    2 + files.reduce((n, f) => n + Math.ceil(f.data.length / SECTOR_SIZE), 0)
  const image = new Uint8Array(sectors * SECTOR_SIZE)
  const padded = title.padEnd(12, '\0')
  for (let i = 0; i < 8; i++) image[i] = padded.charCodeAt(i)
  for (let i = 0; i < 4; i++) image[SECTOR_SIZE + i] = padded.charCodeAt(8 + i)
  image[SECTOR_SIZE + 4] = 0x12 // cycle number, BCD
  image[SECTOR_SIZE + 5] = files.length * 8
  image[SECTOR_SIZE + 6] = (bootOption << 4) | (800 >> 8)
  image[SECTOR_SIZE + 7] = 800 & 0xff

  let sector = 2
  files.forEach((file, index) => {
    const name = 8 + index * 8
    const info = SECTOR_SIZE + 8 + index * 8
    file.name
      .padEnd(7, ' ')
      .split('')
      .forEach((c, i) => (image[name + i] = c.charCodeAt(0)))
    image[name + 7] = file.directory.charCodeAt(0) | (file.locked ? 0x80 : 0)
    const length = file.data.length
    image[info] = file.load & 0xff
    image[info + 1] = (file.load >> 8) & 0xff
    image[info + 2] = file.exec & 0xff
    image[info + 3] = (file.exec >> 8) & 0xff
    image[info + 4] = length & 0xff
    image[info + 5] = (length >> 8) & 0xff
    image[info + 6] =
      (((file.exec >> 16) & 3) << 6) |
      (((length >> 16) & 3) << 4) |
      (((file.load >> 16) & 3) << 2) |
      ((sector >> 8) & 3)
    image[info + 7] = sector & 0xff
    image.set(file.data, sector * SECTOR_SIZE)
    sector += Math.ceil(length / SECTOR_SIZE)
  })
  return image
}

function bytes(length: number, fill: number) {
  return new Uint8Array(length).fill(fill)
}

suite('DFS disk images', function () {
  test('reads the catalogue header', function () {
    const side = parseDfsSide(makeSide('MYDISC`5', [], 3))
    assert.strictEqual(side.title, 'MYDISC£5')
    assert.strictEqual(side.bootOption, 3)
    assert.strictEqual(side.cycle, 12)
    assert.strictEqual(side.discSectors, 800)
    assert.strictEqual(side.imageSectors, 2)
    assert.deepStrictEqual(side.files, [])
    assert.deepStrictEqual(side.warnings, [])
  })

  test('reads file entries and data', function () {
    const image = makeSide('T', [
      {
        name: '!BOOT',
        directory: '$',
        load: 0,
        exec: 0,
        data: bytes(10, 0x41),
      },
      {
        name: 'CODE',
        directory: 'A',
        locked: true,
        load: 0x1900,
        exec: 0x1a00,
        data: bytes(300, 0x42),
      },
    ])
    const [boot, code] = parseDfsSide(image).files
    assert.strictEqual(boot.name, '!BOOT')
    assert.strictEqual(boot.directory, '$')
    assert.strictEqual(boot.locked, false)
    assert.strictEqual(code.name, 'CODE')
    assert.strictEqual(code.directory, 'A')
    assert.strictEqual(code.locked, true)
    assert.strictEqual(code.loadAddress, 0x1900)
    assert.strictEqual(code.execAddress, 0x1a00)
    assert.strictEqual(code.length, 300)
    assert.strictEqual(code.startSector, 3)
    assert.strictEqual(image[code.offset], 0x42)
    assert.strictEqual(code.truncated, false)
  })

  test('unpacks the high bits of each field from the right place', function () {
    // BASIC saved on a real BBC Micro: load &FF1900, exec &FF8023
    const side = makeSide('T', [
      {
        name: 'PROG',
        directory: '$',
        load: 0x31900,
        exec: 0x38023,
        data: bytes(0x10000 + 1, 1),
      },
    ])
    // put the file at sector &102 by moving it, so start-sector bits 8-9 are used
    const moved = new Uint8Array((0x102 + 257) * SECTOR_SIZE)
    moved.set(side.subarray(0, 2 * SECTOR_SIZE))
    moved[SECTOR_SIZE + 8 + 6] |= 0x01
    moved[SECTOR_SIZE + 8 + 7] = 0x02
    const [file] = parseDfsSide(moved).files
    assert.strictEqual(file.loadAddress, 0x31900)
    assert.strictEqual(file.execAddress, 0x38023)
    assert.strictEqual(file.length, 0x10001)
    assert.strictEqual(file.startSector, 0x102)
    assert.strictEqual(formatAddress(file.loadAddress), 'FF1900')
    assert.strictEqual(formatAddress(file.execAddress), 'FF8023')
    assert.strictEqual(formatAddress(0x1900), '001900')
  })

  test('flags files that run past the end of the image', function () {
    const image = makeSide('T', [
      { name: 'BIG', directory: '$', load: 0, exec: 0, data: bytes(1000, 7) },
    ])
    const side = parseDfsSide(image.subarray(0, 3 * SECTOR_SIZE))
    assert.strictEqual(side.files[0].truncated, true)
    assert.strictEqual(side.warnings.length, 1)
  })

  test('rejects data that is not a DFS catalogue', function () {
    assert.throws(() => parseDfsSide(new Uint8Array(256)), /too small/)
    const image = new Uint8Array(512)
    image[SECTOR_SIZE + 5] = 9
    assert.throws(() => parseDfsSide(image), /invalid file list/)
  })

  test('splits a .dsd image into its two interleaved sides', function () {
    const side0 = new Uint8Array(2 * TRACK_SIZE)
    side0.set(
      makeSide('SIDE0', [
        { name: 'A', directory: '$', load: 0, exec: 0, data: bytes(10, 0xa0) },
      ]),
    )
    side0.fill(0xa1, TRACK_SIZE)
    const side2 = makeSide('SIDE2', [
      { name: 'B', directory: '$', load: 0, exec: 0, data: bytes(10, 0xb0) },
    ])

    const dsd = new Uint8Array(3 * TRACK_SIZE)
    dsd.set(side0.subarray(0, TRACK_SIZE), 0)
    dsd.set(side2, TRACK_SIZE)
    dsd.set(side0.subarray(TRACK_SIZE), 2 * TRACK_SIZE)

    const [a, b] = splitDsd(dsd)
    assert.strictEqual(a.length, 2 * TRACK_SIZE)
    assert.strictEqual(b.length, TRACK_SIZE)
    assert.strictEqual(a[TRACK_SIZE], 0xa1)

    const image = parseDfsImage(dsd, 'GAME.DSD')
    assert.strictEqual(image.format, 'dsd')
    assert.deepStrictEqual(
      image.sides.map((s) => [s.drive, s.title, s.files[0].name]),
      [
        [0, 'SIDE0', 'A'],
        [2, 'SIDE2', 'B'],
      ],
    )
  })

  test('treats other names as single-sided', function () {
    const image = parseDfsImage(makeSide('ONE', []), 'disc.ssd')
    assert.strictEqual(image.format, 'ssd')
    assert.strictEqual(image.sides.length, 1)
  })
})
