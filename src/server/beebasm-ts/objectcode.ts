/*************************************************************************************************/
/**
  Derived from objectcode.cpp/h


  Copyright (C) Rich Talbot-Watkins 2007 - 2012

  This file is part of BeebAsm.

  BeebAsm is free software: you can redistribute it and/or modify it under the terms of the GNU
  General Public License as published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  BeebAsm is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
  even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with BeebAsm, as
  COPYING.txt.  If not, see <http://www.gnu.org/licenses/>.
*/
/*************************************************************************************************/

import { integer } from 'vscode-languageserver'
import * as AsmException from './asmexception'
import { SourceMap } from '../../types/shared/debugsource'
import { DocumentContext } from '../documentContext'

enum FLAGS {
  // This memory location has been used so don't assemble over it
  USED = 1 << 0,
  // This memory location has been guarded so don't assemble over it
  GUARD = 1 << 1,
  // On the second pass, check that opcodes match what was written on the first pass
  CHECK = 1 << 2,
  // Suppress the opcode check (set by CLEAR)
  DONT_CHECK = 1 << 3,
}

export class ObjectCode {
  private _PC = 0
  private _CPU = 0
  private _aMemory: number[] = new Array(0x10000)
  private _aFlags: number[] = new Array(0x10000)
  private _aSourceMap: SourceMap[] = new Array(0x10000)
  private _aMapChar: integer[] = new Array(96)
  // After one consistency error, all subsequent code will probably be wrong, so just raise once
  // or we'll get a lot of errors and potentially cause severe slowdown
  private _hadConsistencyError = false
  private _hadSecondPassError = false
  private _context: DocumentContext

  constructor(context: DocumentContext) {
    this._context = context;
    this.Reset();
  }

  public Reset(): void {
    this._PC = 0
    this._CPU = 0
    this._aMemory.fill(0)
    this._aFlags.fill(0)
    this._aMapChar.fill(0)
    this._aSourceMap = new Array(0x10000)
    this._hadConsistencyError = false
    this._hadSecondPassError = false
  }

  public GetCPU(): number {
    return this._CPU
  }

  public GetPC(): number {
    return this._PC
  }

  public SetCPU(i: number): void {
    this._CPU = i
    this._context.symbolTable.ChangeSymbol('CPU', this._CPU)
  }

  public SetPC(i: number): void {
    this._PC = i
  }

  public get HadSecondPassError(): boolean {
    return this._hadSecondPassError
  }

  public set HadSecondPassError(s: boolean) {
    this._hadSecondPassError = s
  }

  public PutByte(b: number): void {
    if (this._PC > 0xffff) {
      throw new AsmException.AssembleError_OutOfMemory()
    }
    if (this._aFlags[this._PC] & FLAGS.GUARD) {
      throw new AsmException.AssembleError_GuardHit()
    }
    if (this._aFlags[this._PC] & FLAGS.USED) {
      throw new AsmException.AssembleError_Overlap()
    }
    this._aFlags[this._PC] |= FLAGS.USED
    this._aMemory[this._PC++] = b
    this._context.symbolTable.ChangeSymbol('P%', this._PC)
  }

  InitialisePass(): void {
    // Reset CPU type and PC
    this.SetCPU(0)
    this.SetPC(0)
    this._context.symbolTable.ChangeSymbol('P%', this._PC)
    // Clear flags between passes
    this.Clear(0, 0x10000, false)
    // initialise ascii mapping table
    for (let i = 0; i < 96; i++) {
      this._aMapChar[i] = i + 32
    }
  }

  Clear(start: number, end: number, all = true) {
    if (start === end) {
      return
    }
    if (all) {
      // via CLEAR command
      // as soon as we force a block to be cleared, we can no longer do inconsistency checks on
      // the object code, so we flag the whole block as DONT_CHECK
      for (let i = start; i < end; i++) {
        this._aMemory[i] = 0
        this._aFlags[i] = 0
      }
    } else {
      // between first and second pass
      // we preserve the memory image and the CHECK flags so that we can test for inconsistencies
      // in the assembled code between first and second passes
      for (let i = start; i < end; i++) {
        this._aFlags[i] &= FLAGS.CHECK | FLAGS.DONT_CHECK
      }
    }
  }

  SetMapping(ascii: number, mapped: number): void {
    // if ( ascii < 32 || ascii > 127 ) {
    // 	throw new Error(`Invalid ascii value ${ascii}`);
    // }
    // if ( mapped < 0 || mapped > 255 ) {
    // 	throw new Error(`Invalid mapped value ${mapped}`);
    // }
    this._aMapChar[ascii - 32] = mapped
  }

  GetMapping(ascii: number): number {
    // if ( ascii < 32 || ascii > 127 ) {
    // 	throw new Error(`Invalid ascii value ${ascii}`);
    // }
    return this._aMapChar[ascii - 32]
  }

  SetGuard(addr: number): void {
    this._aFlags[addr] |= FLAGS.GUARD
  }

  CopyBlock(
    start: integer,
    end: integer,
    dest: integer,
    firstPass: boolean,
  ): void {
    const length = end - start
    if (start + length > 0x10000 || dest + length > 0x10000) {
      throw new AsmException.AssembleError_OutOfMemory()
    }
    if (firstPass) {
      for (let i = 0; i < length; i++) {
        if (this._aFlags[dest + i] & FLAGS.GUARD) {
          throw new AsmException.AssembleError_GuardHit()
        }
        this._aFlags[dest + i] |= this._aFlags[start + i] & FLAGS.USED
      }
    } else if (start < dest) {
      for (let i = length - 1; i >= 0; i--) {
        if (this._aFlags[dest + i] & FLAGS.GUARD) {
          throw new AsmException.AssembleError_GuardHit()
        }
        this._aMemory[dest + i] = this._aMemory[start + i]
        this._aFlags[dest + i] = this._aFlags[start + i]
        this._aFlags[start + i] &= FLAGS.CHECK | FLAGS.DONT_CHECK
      }
    } else if (start > dest) {
      for (let i = 0; i < length; i++) {
        if (this._aFlags[dest + i] & FLAGS.GUARD) {
          throw new AsmException.AssembleError_GuardHit()
        }
        this._aMemory[dest + i] = this._aMemory[start + i]
        this._aFlags[dest + i] = this._aFlags[start + i]
        this._aFlags[start + i] &= FLAGS.CHECK | FLAGS.DONT_CHECK
      }
    }
  }

  Assemble1(opcode: number, sourcemap: SourceMap): void {
    if (this._PC > 0xffff) {
      throw new AsmException.AssembleError_OutOfMemory()
    }
    if (
      this._context.globalData.IsSecondPass() &&
      this._aFlags[this._PC] & FLAGS.CHECK &&
      !(this._aFlags[this._PC] & FLAGS.DONT_CHECK) &&
      this._aMemory[this._PC] !== opcode
    ) {
      if (!this._hadConsistencyError) {
        this._hadConsistencyError = true
        throw new AsmException.AssembleError_InconsistentCode()
      }
    }
    if (this._aFlags[this._PC] & FLAGS.GUARD) {
      throw new AsmException.AssembleError_GuardHit()
    }
    if (this._aFlags[this._PC] & FLAGS.USED) {
      throw new AsmException.AssembleError_Overlap()
    }
    this._aFlags[this._PC] |= FLAGS.USED | FLAGS.CHECK
    this._aSourceMap[this._PC] = sourcemap
    this._aMemory[this._PC++] = opcode
    this._context.symbolTable.ChangeSymbol('P%', this._PC)
  }

  Assemble2(opcode: number, val: number, sourcemap: SourceMap): void {
    if (this._PC > 0xfffe) {
      throw new AsmException.AssembleError_OutOfMemory()
    }
    if (
      this._context.globalData.IsSecondPass() &&
      this._aFlags[this._PC] & FLAGS.CHECK &&
      !(this._aFlags[this._PC] & FLAGS.DONT_CHECK) &&
      this._aMemory[this._PC] !== opcode
    ) {
      if (!this._hadConsistencyError) {
        this._hadConsistencyError = true
        throw new AsmException.AssembleError_InconsistentCode()
      }
    }
    if (this._aFlags[this._PC] & FLAGS.GUARD) {
      throw new AsmException.AssembleError_GuardHit()
    }
    if (this._aFlags[this._PC] & FLAGS.USED) {
      throw new AsmException.AssembleError_Overlap()
    }
    this._aFlags[this._PC] |= FLAGS.USED | FLAGS.CHECK
    this._aSourceMap[this._PC] = sourcemap
    this._aMemory[this._PC++] = opcode
    this._aFlags[this._PC] |= FLAGS.USED
    this._aMemory[this._PC++] = val
    this._context.symbolTable.ChangeSymbol('P%', this._PC)
  }

  Assemble3(opcode: number, addr: number, sourcemap: SourceMap): void {
    if (this._PC > 0xfffd) {
      throw new AsmException.AssembleError_OutOfMemory()
    }
    if (
      this._context.globalData.IsSecondPass() &&
      this._aFlags[this._PC] & FLAGS.CHECK &&
      !(this._aFlags[this._PC] & FLAGS.DONT_CHECK) &&
      this._aMemory[this._PC] !== opcode
    ) {
      if (!this._hadConsistencyError) {
        this._hadConsistencyError = true
        throw new AsmException.AssembleError_InconsistentCode()
      }
    }
    if (
      this._aFlags[this._PC] & FLAGS.GUARD ||
      this._aFlags[this._PC + 1] & FLAGS.GUARD ||
      this._aFlags[this._PC + 2] & FLAGS.GUARD
    ) {
      throw new AsmException.AssembleError_GuardHit()
    }
    if (
      this._aFlags[this._PC] & FLAGS.USED ||
      this._aFlags[this._PC + 1] & FLAGS.USED ||
      this._aFlags[this._PC + 2] & FLAGS.USED
    ) {
      throw new AsmException.AssembleError_Overlap()
    }
    this._aFlags[this._PC] |= FLAGS.USED | FLAGS.CHECK
    this._aSourceMap[this._PC] = sourcemap
    this._aMemory[this._PC++] = opcode
    this._aFlags[this._PC] |= FLAGS.USED
    this._aMemory[this._PC++] = addr & 0xff
    this._aFlags[this._PC] |= FLAGS.USED
    this._aMemory[this._PC++] = (addr & 0xff00) >> 8
    this._context.symbolTable.ChangeSymbol('P%', this._PC)
  }

  public GetSourceMap(): SourceMap[] {
    return this._aSourceMap
  }
}
