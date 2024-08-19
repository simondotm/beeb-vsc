// Shared types for saving and reading source map files

// Type to store sourcemap info
export type SourceMap = {
  file: number
  line: number
  column: number
  parent: SourceMap | null
}

export type SourceFileMap = {
  [key: number]: string
}

export type SourceAddressMap = {
  [address: number]: SourceMap
}

export type LabelMap = {
  [label: string]: number
}

export type SourceMapFile = {
  sources: SourceFileMap
  labels: LabelMap
  symbols: LabelMap
  addresses: SourceAddressMap
}
