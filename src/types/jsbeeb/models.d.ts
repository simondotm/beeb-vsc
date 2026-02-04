declare module 'jsbeeb/models' {
  export type SWRAM = [
    bank0: boolean,
    bank1: boolean,
    bank2: boolean,
    bank3: boolean,
    bank4: boolean,
    bank5: boolean,
    bank6: boolean,
    bank7: boolean,
    bank8: boolean,
    bank9: boolean,
    bankA: boolean,
    bankB: boolean,
    bankC: boolean,
    bankD: boolean,
    bankE: boolean,
    bankF: boolean,
  ]
  export const enum DEFAULT_ROMS {
    OS_1_2 = 'os.rom',
    BASIC = 'BASIC.ROM',
    DFS_0_9 = 'b/DFS-0.9.rom',
    DFS_1_2 = 'b/DFS-1.2.rom',
    ADFS_1770 = 'b1770/dfs1770.rom',
    ZADFS_1770 = 'b1770/zADFS.ROM',
    MOS_3_20 = 'master/mos3.20',
  }
  export type OsRomTypes = string
  export class Model {
    name: string
    synonyms: string[]
    os: string[]
    _cpuModel: number
    isMaster: boolean
    Fdc: any // This is a class constructor
    swram: boolean[]
    isTest: boolean
    tube: any
    cmosOverride: any
    hasEconet: boolean
    hasMusic5000: boolean

    get nmos(): boolean
    get opcodesFactory(): any
    constructor(
      name: string,
      synonyms: string[],
      os: string[],
      cpuModel: number,
      isMaster: boolean,
      swram: boolean[],
      fdc: any,
      tube?: any,
      cmosOverride?: any,
    )
  }

  export interface CpuConfig {
    keyLayout?: string
    cpuMultiplier?: number
    userPort?: any
    printerPort?: any
    extraRoms?: any[]
    debugFlags?: any
    videoCyclesBatch?: number
    getGamepads?: () => any
  }
  export function findModel(name: string): Model
  export const allModels: Model[]
  export const TEST_6502: Model
  export const TEST_65C12: Model
  export const basicOnly: Model
}
