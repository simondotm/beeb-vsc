/*************************************************************************************************/
/**
  Derived from lineparser.cpp/h and other files in the same namespace

  Represents a line of the source file


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

import { DocumentLink, Location, integer } from 'vscode-languageserver'
import { SourceCode, MacroInstance } from './sourcecode'
import { SourceFile } from './sourcefile'
import { SymbolTable } from './symboltable'
import { GlobalData } from './globaldata'
import { ObjectCode } from './objectcode'
import { MacroTable } from './macro'
import * as AsmException from './asmexception'
import { strftime } from '../strftime-master/strftime'
import { AST, ASTType } from '../ast'
import { FileHandler } from '../filehandler'
import * as path from 'path'
import { URI } from 'vscode-uri'
// import exp = require('constants');
// import { match } from 'assert';

const MAX_VALUES = 128
const MAX_OPERATORS = 32

function isdigit(ch: string): boolean {
  return ch.match(/[0-9]/i) !== null
}

function isalpha(ch: string): boolean {
  return ch.match(/[a-z]/i) !== null
}

// Check if can replace with isdigit later
function is_decimal_digit(ch: string): boolean {
  return ch.match(/[0-9]/) !== null
}

function hex_digit_value(ch: string): integer {
  if (ch.match(/[0-9]/) !== null) {
    return ch.charCodeAt(0) - '0'.charCodeAt(0)
  }
  if (ch.match(/[A-F]/) !== null) {
    return ch.charCodeAt(0) - 'A'.charCodeAt(0) + 10
  }
  if (ch.match(/[a-f]/) !== null) {
    return ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10
  }
  return -1
}

function isspace(ch: string): boolean {
  return ch.match(/\s/) !== null
}

type Token = {
  name: string
  handler: string //() => void;
  directiveHandler: string //(line:string, column:number) => void; // These are pointers to functions in c++ but not sure if need yet
}

function Data(
  cpu: number,
  op: string,
  imp: number,
  acc: number,
  imm: number,
  zp: number,
  zpx: number,
  zpy: number,
  abs: number,
  absx: number,
  absy: number,
  ind: number,
  indx: number,
  indy: number,
  ind16: number,
  ind16x: number,
  rel: number,
): OpcodeData {
  const opcodes: number[] = [
    imp,
    acc,
    imm,
    zp,
    zpx,
    zpy,
    abs,
    absx,
    absy,
    ind,
    indx,
    indy,
    ind16,
    ind16x,
    rel,
  ]
  return { opcodes, op, cpu }
}

type OpcodeData = {
  opcodes: number[]
  op: string
  cpu: number
}

enum ADDRESSING_MODE {
  IMP,
  ACC,
  IMM,
  ZP,
  ZPX,
  ZPY,
  ABS,
  ABSX,
  ABSY,
  IND,
  INDX,
  INDY,
  IND16,
  IND16X,
  REL,

  NUM_ADDRESSING_MODES, // remove if not needed
}
enum TYPE {
  VALUE_OR_UNARY,
  BINARY,
}
// type OperatorHandler = () => void;

type Operator = {
  token: string
  precedence: integer
  parameterCount: integer
  handler: string //OperatorHandler;
}

// simple class to hold symbol table and call line parser on source code
export class LineParser {
  private _sourceCode: SourceCode
  public _line: string
  public _column: integer = 0
  private _lineno: integer
  private _gaTokenTable: Token[]
  private static _gaOpcodeTable: OpcodeData[]
  private static _gaUnaryOperatorTable: Operator[]
  private static _gaBinaryOperatorTable: Operator[]
  private _valueStackPtr: integer = 0
  private _operatorStackPtr: integer = 0
  private _valueStack: (number | string)[] = []
  private _operatorStack: Operator[] = []
  private _ASTValueStack: AST[] = []
  private _ASTOpStack: AST[] = []
  private _tree: AST
  private _parentAST: AST
  private _currentAST: AST

  constructor(sourceCode: SourceCode, line: string, lineno: integer) {
    this._sourceCode = sourceCode
    this._line = line
    this._lineno = lineno
    this._gaTokenTable = [
      { name: '.', handler: 'HandleDefineLabel', directiveHandler: '' },
      { name: '\\', handler: 'HandleDefineComment', directiveHandler: '' },
      { name: ';', handler: 'HandleDefineComment', directiveHandler: '' },
      { name: ':', handler: 'HandleStatementSeparator', directiveHandler: '' },
      { name: 'PRINT', handler: 'HandlePrint', directiveHandler: '' },
      { name: 'CPU', handler: 'HandleCpu', directiveHandler: '' },
      { name: 'ORG', handler: 'HandleOrg', directiveHandler: '' },
      { name: 'INCLUDE', handler: 'HandleInclude', directiveHandler: '' },
      { name: 'EQUB', handler: 'HandleEqub', directiveHandler: '' },
      { name: 'EQUD', handler: 'HandleEqud', directiveHandler: '' },
      { name: 'EQUS', handler: 'HandleEqub', directiveHandler: '' },
      { name: 'EQUW', handler: 'HandleEquw', directiveHandler: '' },
      { name: 'ASSERT', handler: 'HandleAssert', directiveHandler: '' },
      { name: 'SAVE', handler: 'HandleSave', directiveHandler: '' },
      { name: 'FOR', handler: 'HandleFor', directiveHandler: '' },
      { name: 'NEXT', handler: 'HandleNext', directiveHandler: '' },
      { name: 'IF', handler: 'HandleIf', directiveHandler: 'AddIfLevel' },
      { name: 'ELIF', handler: 'HandleIf', directiveHandler: 'StartElIf' },
      {
        name: 'ELSE',
        handler: 'HandleDirective',
        directiveHandler: 'StartElse',
      },
      {
        name: 'ENDIF',
        handler: 'HandleDirective',
        directiveHandler: 'RemoveIfLevel',
      },
      { name: 'ALIGN', handler: 'HandleAlign', directiveHandler: '' },
      { name: 'SKIPTO', handler: 'HandleSkipTo', directiveHandler: '' },
      { name: 'SKIP', handler: 'HandleSkip', directiveHandler: '' },
      { name: 'GUARD', handler: 'HandleGuard', directiveHandler: '' },
      { name: 'CLEAR', handler: 'HandleClear', directiveHandler: '' },
      { name: 'INCBIN', handler: 'HandleIncBin', directiveHandler: '' },
      { name: '{', handler: 'HandleOpenBrace', directiveHandler: '' },
      { name: '}', handler: 'HandleCloseBrace', directiveHandler: '' },
      { name: 'MAPCHAR', handler: 'HandleMapChar', directiveHandler: '' },
      { name: 'PUTFILE', handler: 'HandlePutFile', directiveHandler: '' },
      { name: 'PUTTEXT', handler: 'HandlePutText', directiveHandler: '' },
      { name: 'PUTBASIC', handler: 'HandlePutBasic', directiveHandler: '' },
      { name: 'MACRO', handler: 'HandleMacro', directiveHandler: 'StartMacro' },
      {
        name: 'ENDMACRO',
        handler: 'HandleEndMacro',
        directiveHandler: 'EndMacro',
      },
      { name: 'ERROR', handler: 'HandleError', directiveHandler: '' },
      { name: 'COPYBLOCK', handler: 'HandleCopyBlock', directiveHandler: '' },
      { name: 'RANDOMIZE', handler: 'HandleRandomize', directiveHandler: '' },
      { name: 'ASM', handler: 'HandleAsm', directiveHandler: '' },
    ]
    LineParser._gaOpcodeTable = [
      Data(
        0,
        'ADC',
        -1,
        -1,
        0x69,
        0x65,
        0x75,
        -1,
        0x6d,
        0x7d,
        0x79,
        0x172,
        0x61,
        0x71,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'AND',
        -1,
        -1,
        0x29,
        0x25,
        0x35,
        -1,
        0x2d,
        0x3d,
        0x39,
        0x132,
        0x21,
        0x31,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'ASL',
        -1,
        0x0a,
        -1,
        0x06,
        0x16,
        -1,
        0x0e,
        0x1e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'BCC',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x90,
      ),
      Data(
        0,
        'BCS',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0xb0,
      ),
      Data(
        0,
        'BEQ',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0xf0,
      ),
      Data(
        0,
        'BIT',
        -1,
        -1,
        0x189,
        0x24,
        0x134,
        -1,
        0x2c,
        0x13c,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'BMI',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x30,
      ),
      Data(
        0,
        'BNE',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0xd0,
      ),
      Data(
        0,
        'BPL',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x10,
      ),
      Data(
        1,
        'BRA',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x180,
      ),
      Data(
        0,
        'BRK',
        0x00,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'BVC',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x50,
      ),
      Data(
        0,
        'BVS',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x70,
      ),
      Data(
        0,
        'CLC',
        0x18,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'CLD',
        0xd8,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'CLI',
        0x58,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'CLR',
        -1,
        -1,
        -1,
        0x164,
        0x174,
        -1,
        0x19c,
        0x19e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'CLV',
        0xb8,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'CMP',
        -1,
        -1,
        0xc9,
        0xc5,
        0xd5,
        -1,
        0xcd,
        0xdd,
        0xd9,
        0x1d2,
        0xc1,
        0xd1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'CPX',
        -1,
        -1,
        0xe0,
        0xe4,
        -1,
        -1,
        0xec,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'CPY',
        -1,
        -1,
        0xc0,
        0xc4,
        -1,
        -1,
        0xcc,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'DEA',
        0x13a,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'DEC',
        -1,
        0x13a,
        -1,
        0xc6,
        0xd6,
        -1,
        0xce,
        0xde,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'DEX',
        0xca,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'DEY',
        0x88,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'EOR',
        -1,
        -1,
        0x49,
        0x45,
        0x55,
        -1,
        0x4d,
        0x5d,
        0x59,
        0x152,
        0x41,
        0x51,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'INA',
        0x11a,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'INC',
        -1,
        0x11a,
        -1,
        0xe6,
        0xf6,
        -1,
        0xee,
        0xfe,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'INX',
        0xe8,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'INY',
        0xc8,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'JMP',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x4c,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x6c,
        0x17c,
        -1,
      ),
      Data(
        0,
        'JSR',
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0x20,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'LDA',
        -1,
        -1,
        0xa9,
        0xa5,
        0xb5,
        -1,
        0xad,
        0xbd,
        0xb9,
        0x1b2,
        0xa1,
        0xb1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'LDX',
        -1,
        -1,
        0xa2,
        0xa6,
        -1,
        0xb6,
        0xae,
        -1,
        0xbe,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'LDY',
        -1,
        -1,
        0xa0,
        0xa4,
        0xb4,
        -1,
        0xac,
        0xbc,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'LSR',
        -1,
        0x4a,
        -1,
        0x46,
        0x56,
        -1,
        0x4e,
        0x5e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'NOP',
        0xea,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'ORA',
        -1,
        -1,
        0x09,
        0x05,
        0x15,
        -1,
        0x0d,
        0x1d,
        0x19,
        0x112,
        0x01,
        0x11,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'PHA',
        0x48,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'PHP',
        0x08,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'PHX',
        0x1da,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'PHY',
        0x15a,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'PLA',
        0x68,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'PLP',
        0x28,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'PLX',
        0x1fa,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'PLY',
        0x17a,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'ROL',
        -1,
        0x2a,
        -1,
        0x26,
        0x36,
        -1,
        0x2e,
        0x3e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'ROR',
        -1,
        0x6a,
        -1,
        0x66,
        0x76,
        -1,
        0x6e,
        0x7e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'RTI',
        0x40,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'RTS',
        0x60,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'SBC',
        -1,
        -1,
        0xe9,
        0xe5,
        0xf5,
        -1,
        0xed,
        0xfd,
        0xf9,
        0x1f2,
        0xe1,
        0xf1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'SEC',
        0x38,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'SED',
        0xf8,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'SEI',
        0x78,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'STA',
        -1,
        -1,
        -1,
        0x85,
        0x95,
        -1,
        0x8d,
        0x9d,
        0x99,
        0x192,
        0x81,
        0x91,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'STX',
        -1,
        -1,
        -1,
        0x86,
        -1,
        0x96,
        0x8e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'STY',
        -1,
        -1,
        -1,
        0x84,
        0x94,
        -1,
        0x8c,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'STZ',
        -1,
        -1,
        -1,
        0x164,
        0x174,
        -1,
        0x19c,
        0x19e,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'TAX',
        0xaa,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'TAY',
        0xa8,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'TRB',
        -1,
        -1,
        -1,
        0x114,
        -1,
        -1,
        0x11c,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        1,
        'TSB',
        -1,
        -1,
        -1,
        0x104,
        -1,
        -1,
        0x10c,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'TSX',
        0xba,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'TXA',
        0x8a,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'TXS',
        0x9a,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
      Data(
        0,
        'TYA',
        0x98,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
      ),
    ]
    LineParser._gaUnaryOperatorTable = [
      { token: '(', precedence: -1, parameterCount: 0, handler: '' }, // special case
      { token: '[', precedence: -1, parameterCount: 0, handler: '' }, // special case
      { token: '-', precedence: 8, parameterCount: 0, handler: 'EvalNegate' },
      { token: '+', precedence: 8, parameterCount: 0, handler: 'EvalPosate' },
      { token: 'HI(', precedence: 10, parameterCount: 1, handler: 'EvalHi' },
      { token: 'LO(', precedence: 10, parameterCount: 1, handler: 'EvalLo' },
      { token: '>', precedence: 10, parameterCount: 0, handler: 'EvalHi' },
      { token: '<', precedence: 10, parameterCount: 0, handler: 'EvalLo' },
      { token: 'SIN(', precedence: 10, parameterCount: 1, handler: 'EvalSin' },
      { token: 'COS(', precedence: 10, parameterCount: 1, handler: 'EvalCos' },
      { token: 'TAN(', precedence: 10, parameterCount: 1, handler: 'EvalTan' },
      {
        token: 'ASN(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalArcSin',
      },
      {
        token: 'ACS(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalArcCos',
      },
      {
        token: 'ATN(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalArcTan',
      },
      { token: 'SQR(', precedence: 10, parameterCount: 1, handler: 'EvalSqrt' },
      {
        token: 'RAD(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalDegToRad',
      },
      {
        token: 'DEG(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalRadToDeg',
      },
      { token: 'INT(', precedence: 10, parameterCount: 1, handler: 'EvalInt' },
      { token: 'ABS(', precedence: 10, parameterCount: 1, handler: 'EvalAbs' },
      { token: 'SGN(', precedence: 10, parameterCount: 1, handler: 'EvalSgn' },
      { token: 'RND(', precedence: 10, parameterCount: 1, handler: 'EvalRnd' },
      { token: 'NOT(', precedence: 10, parameterCount: 1, handler: 'EvalNot' },
      { token: 'LOG(', precedence: 10, parameterCount: 1, handler: 'EvalLog' },
      { token: 'LN(', precedence: 10, parameterCount: 1, handler: 'EvalLn' },
      { token: 'EXP(', precedence: 10, parameterCount: 1, handler: 'EvalExp' },
      {
        token: 'TIME$(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalTime',
      },
      { token: 'STR$(', precedence: 10, parameterCount: 1, handler: 'EvalStr' },
      {
        token: 'STR$~(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalStrHex',
      },
      { token: 'VAL(', precedence: 10, parameterCount: 1, handler: 'EvalVal' },
      {
        token: 'EVAL(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalEval',
      },
      { token: 'LEN(', precedence: 10, parameterCount: 1, handler: 'EvalLen' },
      { token: 'CHR$(', precedence: 10, parameterCount: 1, handler: 'EvalChr' },
      { token: 'ASC(', precedence: 10, parameterCount: 1, handler: 'EvalAsc' },
      { token: 'MID$(', precedence: 10, parameterCount: 3, handler: 'EvalMid' },
      {
        token: 'LEFT$(',
        precedence: 10,
        parameterCount: 2,
        handler: 'EvalLeft',
      },
      {
        token: 'RIGHT$(',
        precedence: 10,
        parameterCount: 2,
        handler: 'EvalRight',
      },
      {
        token: 'STRING$(',
        precedence: 10,
        parameterCount: 2,
        handler: 'EvalString',
      },
      {
        token: 'UPPER$(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalUpper',
      },
      {
        token: 'LOWER$(',
        precedence: 10,
        parameterCount: 1,
        handler: 'EvalLower',
      },
    ]
    LineParser._gaBinaryOperatorTable = [
      { token: ')', precedence: -1, parameterCount: 0, handler: '' }, // special case
      { token: ']', precedence: -1, parameterCount: 0, handler: '' }, // special case
      { token: ',', precedence: -1, parameterCount: 0, handler: '' }, // special case
      { token: '^', precedence: 7, parameterCount: 0, handler: 'EvalPower' },
      { token: '*', precedence: 6, parameterCount: 0, handler: 'EvalMultiply' },
      { token: '/', precedence: 6, parameterCount: 0, handler: 'EvalDivide' },
      { token: '%', precedence: 6, parameterCount: 0, handler: 'EvalMod' },
      { token: 'DIV', precedence: 6, parameterCount: 0, handler: 'EvalDiv' },
      { token: 'MOD', precedence: 6, parameterCount: 0, handler: 'EvalMod' },
      {
        token: '<<',
        precedence: 6,
        parameterCount: 0,
        handler: 'EvalShiftLeft',
      },
      {
        token: '>>',
        precedence: 6,
        parameterCount: 0,
        handler: 'EvalShiftRight',
      },
      { token: '+', precedence: 5, parameterCount: 0, handler: 'EvalAdd' },
      { token: '-', precedence: 5, parameterCount: 0, handler: 'EvalSubtract' },
      { token: '==', precedence: 4, parameterCount: 0, handler: 'EvalEqual' },
      { token: '=', precedence: 4, parameterCount: 0, handler: 'EvalEqual' },
      {
        token: '<>',
        precedence: 4,
        parameterCount: 0,
        handler: 'EvalNotEqual',
      },
      {
        token: '!=',
        precedence: 4,
        parameterCount: 0,
        handler: 'EvalNotEqual',
      },
      {
        token: '<=',
        precedence: 4,
        parameterCount: 0,
        handler: 'EvalLessThanOrEqual',
      },
      {
        token: '>=',
        precedence: 4,
        parameterCount: 0,
        handler: 'EvalMoreThanOrEqual',
      },
      { token: '<', precedence: 4, parameterCount: 0, handler: 'EvalLessThan' },
      { token: '>', precedence: 4, parameterCount: 0, handler: 'EvalMoreThan' },
      { token: 'AND', precedence: 3, parameterCount: 0, handler: 'EvalAnd' },
      { token: 'OR', precedence: 2, parameterCount: 0, handler: 'EvalOr' },
      { token: 'EOR', precedence: 2, parameterCount: 0, handler: 'EvalEor' },
    ]
    this._tree = {
      type: ASTType.Line,
      value: '',
      startColumn: this._column,
      children: [],
    }
    this._parentAST = this._tree // start at the root, change as enter subexpressions
    this._currentAST = this._tree // not used, just placeholder until gets set
  }

  public Process(): void {
    let processedSomething = false
    while (this.AdvanceAndCheckEndOfLine()) {
      processedSomething = true
      const oldColumn: integer = this._column

      // Priority: check if it's symbol assignment and let it take priority over keywords
      // This means symbols can begin with reserved words, e.g. PLAyer, but in the case of
      // the line 'player = 1', the meaning is unambiguous, so we allow it as a symbol
      // assignment.
      let bIsSymbolAssignment = false

      if (
        isalpha(this._line[this._column]) ||
        this._line[this._column] == '_'
      ) {
        do {
          this._column++
        } while (
          this._column < this._line.length &&
          (isalpha(this._line[this._column]) ||
            isdigit(this._line[this._column]) ||
            this._line[this._column] == '_' ||
            this._line[this._column] == '%' ||
            this._line[this._column] == '$') &&
          this._line[this._column - 1] != '%' &&
          this._line[this._column - 1] != '$'
        )

        if (this.AdvanceAndCheckEndOfStatement()) {
          if (this._line[this._column] == '=') {
            // if we have a valid symbol name, followed by an '=', it is definitely
            // a symbol assignment.
            bIsSymbolAssignment = true
          }
        }
      }
      this._column = oldColumn

      // first check tokens - they have priority over opcodes, so that they can have names
      // like INCLUDE (which would otherwise be interpreted as INC LUDE)
      if (!bIsSymbolAssignment) {
        const token = this.GetTokenAndAdvanceColumn()
        if (token !== -1) {
          this.HandleToken(token, oldColumn)
          continue
        }
      }

      // Next we see if we should even be trying to execute anything.... maybe the if condition is false
      // For parsing, might want to process the statement but can get errors e.g. symbol already defined
      // Are following external loops that could change the condition, so probably fine to skip if false
      if (!this._sourceCode.IsIfConditionTrue()) {
        this._column = oldColumn
        this.SkipStatement()
        continue
      }

      // No token match - check against opcodes
      if (!bIsSymbolAssignment) {
        const token = this.GetInstructionAndAdvanceColumn()
        if (token != -1) {
          this.HandleAssembler(token)
          continue
        }
      }

      if (bIsSymbolAssignment) {
        // Deal here with symbol assignment
        let bIsConditionalAssignment = false
        const startLoc = { line: this._lineno, character: this._column }
        const symbolName =
          this.GetSymbolName() + this._sourceCode.GetSymbolNameSuffix()
        const endLoc = { line: this._lineno, character: this._column }

        if (!this.AdvanceAndCheckEndOfStatement()) {
          throw new AsmException.SyntaxError_UnrecognisedToken(
            this._line,
            oldColumn,
          )
        }

        if (this._line[this._column] != '=') {
          throw new AsmException.SyntaxError_UnrecognisedToken(
            this._line,
            oldColumn,
          )
        }

        this._column++

        if (this._line[this._column] == '?') {
          bIsConditionalAssignment = true
          this._column++
        }

        const value: number | string = this.EvaluateExpression()

        if (
          GlobalData.Instance.IsFirstPass() &&
          this._sourceCode.GetForCount() === 0
        ) {
          // only add the symbol on the first pass

          if (SymbolTable.Instance.IsSymbolDefined(symbolName)) {
            if (!bIsConditionalAssignment) {
              throw new AsmException.SyntaxError_LabelAlreadyDefined(
                this._line,
                oldColumn,
              )
            }
          } else {
            const loc = {
              uri: this._sourceCode.GetURI(),
              range: { start: startLoc, end: endLoc },
            }
            SymbolTable.Instance.AddSymbol(symbolName, value, loc)
          }
        }
        // else {

        this._currentAST = {
          type: ASTType.VariableDeclaration,
          value: symbolName,
          startColumn: startLoc.character,
          children: [],
        }
        this._currentAST.children.push(this._ASTValueStack[0])
        this._parentAST.children.push(this._currentAST)
        // }

        if (
          this._column < this._line.length &&
          this._line[this._column] == ','
        ) {
          // Unexpected comma (remembering that an expression can validly end with a comma)
          throw new AsmException.SyntaxError_UnexpectedComma(
            this._line,
            this._column,
          )
        }

        continue
      }

      // Check macro matches

      if (
        isalpha(this._line[this._column]) ||
        this._line[this._column] == '_'
      ) {
        const macroName = this.GetSymbolName()
        const macro = MacroTable.Instance.Get(macroName)
        if (macro !== undefined) {
          this.HandleOpenBrace()

          // add reference
          if (GlobalData.Instance.IsSecondPass()) {
            const loc = {
              uri: this._sourceCode.GetURI(),
              range: {
                start: {
                  line: this._lineno,
                  character: this._column - macroName.length,
                },
                end: { line: this._lineno, character: this._column },
              },
            }
            MacroTable.Instance.AddReference(macroName, loc)
          }

          // add macro reference to AST
          this._currentAST = {
            type: ASTType.MacroCall,
            value: macroName,
            startColumn: oldColumn,
            children: [],
          }
          this._parentAST.children.push(this._currentAST)

          for (let i = 0; i < macro.GetNumberOfParameters(); i++) {
            const paramName =
              macro.GetParameter(i) + this._sourceCode.GetSymbolNameSuffix()

            try {
              if (!SymbolTable.Instance.IsSymbolDefined(paramName)) {
                const value = this.EvaluateExpression()
                const loc = {
                  uri: this._sourceCode.GetURI(),
                  range: {
                    start: { line: this._lineno, character: oldColumn },
                    end: { line: this._lineno, character: this._column },
                  },
                }
                SymbolTable.Instance.AddSymbol(paramName, value, loc)
              } else if (GlobalData.Instance.IsSecondPass()) {
                // We must remove the symbol before evaluating the expression,
                // otherwise nested macros which share the same parameter name can
                // evaluate the inner macro parameter using the old value of the inner
                // macro parameter rather than the new value of the outer macro
                // parameter. See local-forward-branch-5.6502 for an example.
                SymbolTable.Instance.RemoveSymbol(paramName)
                const value = this.EvaluateExpression()
                const loc = {
                  uri: this._sourceCode.GetURI(),
                  range: {
                    start: { line: this._lineno, character: oldColumn },
                    end: { line: this._lineno, character: this._column },
                  },
                }
                SymbolTable.Instance.AddSymbol(paramName, value, loc)
              }
            } catch (e) {
              if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
                if (GlobalData.Instance.IsSecondPass()) {
                  throw e
                }
              }
            }

            if (i != macro.GetNumberOfParameters() - 1) {
              if (
                this._column >= this._line.length ||
                this._line[this._column] != ','
              ) {
                throw new AsmException.SyntaxError_InvalidCharacter(
                  this._line,
                  this._column,
                )
              }

              this._column++
            }
          }

          if (this.AdvanceAndCheckEndOfStatement()) {
            throw new AsmException.SyntaxError_InvalidCharacter(
              this._line,
              this._column,
            )
          }

          const macroInstance = new MacroInstance(
            macro,
            this._sourceCode,
            this._sourceCode.GetDiagnostics(),
            this._sourceCode.GetURI(),
            this._sourceCode.GetTrees(),
            this._sourceCode.GetDocumentLinks(),
          )
          macroInstance.Process()

          this.HandleCloseBrace()

          if (this._sourceCode.ShouldOutputAsm()) {
            // cout << "End macro " << macroName << endl;
          }

          continue
        }
      }

      // If we got this far, we didn't recognise anything, so throw an error
      throw new AsmException.SyntaxError_UnrecognisedToken(
        this._line,
        oldColumn,
      )
    }

    // If we didn't process anything, i.e. this is a blank line, we must still call SkipStatement()
    // if we're defining a macro, otherwise blank lines inside macro definitions cause incorrect
    // line numbers to be reported for errors when expanding a macro definition.
    if (!processedSomething) {
      if (!this._sourceCode.IsIfConditionTrue()) {
        this._column = 0
        this.SkipStatement()
      }
    }
  }

  private GetSymbolName(): string {
    // assert(isalpha(this._line[this._column]) || this._line[this._column] == '_');

    let symbolName = ''

    do {
      symbolName += this._line[this._column++]
    } while (
      this._column < this._line.length &&
      (isalpha(this._line[this._column]) ||
        isdigit(this._line[this._column]) ||
        this._line[this._column] == '_' ||
        this._line[this._column] == '%' ||
        this._line[this._column] == '$') &&
      this._line[this._column - 1] != '%' &&
      this._line[this._column - 1] != '$'
    )

    return symbolName
  }

  private GetInstructionAndAdvanceColumn(
    requireDistinctOpcodes = true,
  ): integer {
    requireDistinctOpcodes = false //TODO: get from settings
    for (let i: integer = 0; i < LineParser._gaOpcodeTable.length; i++) {
      const token = LineParser._gaOpcodeTable[i].op
      const len = token.length

      // TODO: implement cpu if appropriate
      // const cpu = LineParser._gaOpcodeTable[i].cpu;
      // // ignore instructions not for current cpu
      // if (cpu > this._sourceCode.GetCPU()) {
      // 	continue;
      // }

      // see if token matches
      let bMatch = true
      for (let j = 0; j < len; j++) {
        if (token[j] != this._line[this._column + j].toUpperCase()) {
          bMatch = false
          break
        }
      }

      // The token matches so far, but (optionally) check there's nothing after it; this prevents
      // false matches where a macro name begins with an opcode, at the cost of disallowing
      // things like "foo=&70:stafoo".
      if (requireDistinctOpcodes && bMatch) {
        const k = this._column + len
        if (k < this._line.length) {
          if (isalpha(this._line[k]) || this._line[k] == '_') {
            bMatch = false
          }
        }
      }

      if (bMatch) {
        this._currentAST = {
          type: ASTType.Assembly,
          value: token,
          startColumn: this._column,
          children: [],
        }
        this._parentAST.children.push(this._currentAST)
        this._parentAST = this._currentAST
        this._column += len
        return i
      }
    }
    return -1
  }

  private AdvanceAndCheckEndOfLine(): boolean {
    return this.MoveToNextAtom()
  }

  public AdvanceAndCheckEndOfStatement(): boolean {
    return this.MoveToNextAtom(';:\\{}')
  }

  private MoveToNextAtom(terminators?: string): boolean {
    if (!this.EatWhitespace()) {
      return false
    }

    if (terminators !== undefined) {
      let i = 0

      while (i < terminators.length) {
        if (this._line[this._column] == terminators[i]) {
          return false
        }

        i++
      }
    }

    return true
  }

  public EatWhitespace(): boolean {
    const newColumn = this._line.slice(this._column).search(/[^ \t\r\n]/i)
    if (newColumn == -1) {
      this._column = this._line.length
      return false
    } else {
      this._column += newColumn
      return true
    }
  }

  private GetTokenAndAdvanceColumn(): integer {
    const remaining = this._line.length - this._column

    for (let i = 0; i < this._gaTokenTable.length; i++) {
      const token = this._gaTokenTable[i].name
      const len = token.length

      if (len <= remaining) {
        // see if token matches

        let bMatch = true
        for (let j = 0; j < len; j++) {
          if (token[j] != this._line[this._column + j].toUpperCase()) {
            bMatch = false
            break
          }
        }

        if (bMatch) {
          this._column += len
          return i
        }
      }
    }

    return -1
  }

  private AdvanceAndCheckEndOfSubStatement(includeComma: boolean): boolean {
    if (includeComma) {
      return this.MoveToNextAtom(';:\\,{}')
    } else {
      return this.MoveToNextAtom(';:\\{}')
    }
  }

  // No doubt there is some smart way to do this by either iterating over _gaTokenTable or getting methods matching desired signature ()=>void
  // Or just set to ignore??? Probably best!
  private Execute(member: string) {
    // if (member === "HandleDefineLabel" || member === "HandleDefineComment" || member === "HandleDefineComment"
    // || member === "HandleStatementSeparator" || member === "HandlePrint" || member === "HandleCpu"
    // || member === "HandleOrg" || member === "HandleInclude" || member === "HandleEqub"
    // || member === "HandleEqud" || member === "HandleEquw" || member === "HandleEqu"
    // || member === "HandleAssert" || member === "HandleSave" || member === "HandleFor" || member === "HandleNext"
    // || member === "HandleIf" || member === "HandleIf" || member === "HandleDirective"
    // || member === "HandleDirective" || member === "HandleAlign" || member === "HandleSkipTo"
    // || member === "HandleSkip" || member === "HandleGuard" || member === "HandleClear"
    // || member === "HandleIncBin" || member === "HandleOpenBrace" || member === "HandleCloseBrace"
    // || member === "HandleMapChar" || member === "HandlePutFile" || member === "HandlePutText"
    // || member === "HandlePutBasic" || member === "HandleMacro" || member === "HandleEndMacro"
    // || member === "HandleError" || member === "HandleCopyBlock" || member === "HandleRandomize"
    // || member === "HandleAsm" || member === "EvalPower" || member === "EvalMultiply" || member === "EvalDivide"
    // || member === "EvalMod" || member === "EvalDiv" || member === "EvalShiftLeft" || member === "EvalShiftRight"
    // || member === "EvalAdd" || member === "EvalSubtract" || member === "EvalEqual" || member === "EvalNotEqual"
    // || member === "EvalLessThanOrEqual" || member === "EvalMoreThanOrEqual" || member === "EvalLessThan"
    // || member === "EvalMoreThan" || member === "EvalAnd" || member === "EvalOr" || member === "EvalEor"
    // || member === "EvalNegate" || member === "EvalPosate" || member === "EvalHi" || member === "EvalLo"
    // || member === "EvalSin" || member === "EvalCos" || member === "EvalTan" || member === "EvalArcSin"
    // || member === "EvalArcCos" || member === "EvalArcTan" || member === "EvalSqrt" || member === "EvalDegToRad"
    // || member === "EvalRadToDeg" || member === "EvalInt" || member === "EvalAbs" || member === "EvalSgn"
    // || member === "EvalRnd" || member === "EvalNot" || member === "EvalLog" || member === "EvalLn"
    // || member === "EvalExp" || member === "EvalTime" || member === "EvalStr" || member === "EvalStrHex"
    // || member === "EvalVal" || member === "EvalEval" || member === "EvalLen" || member === "EvalChr"
    // || member === "EvalAsc" || member === "EvalMid" || member === "EvalLeft" || member === "EvalRight"
    // || member === "EvalString" || member === "EvalUpper" || member === "EvalLower" ) {
    // @ts-expect-error avoid having to specify every possible member - can uncomment above if really needed
    this[member]()
    // }
  }

  private HandleToken(i: integer, oldColumn: integer): void {
    // assert(i >= 0);
    this._currentAST = {
      type: ASTType.Command,
      value: this._gaTokenTable[i].name,
      startColumn: oldColumn,
      children: [],
    }

    if (this._gaTokenTable[i].directiveHandler !== '') {
      this._sourceCode.Execute(
        this._gaTokenTable[i].directiveHandler,
        this._line,
        this._column,
      )
    }

    if (this._sourceCode.IsIfConditionTrue()) {
      this.Execute(this._gaTokenTable[i].handler)
    } else {
      this._column = oldColumn
      this.SkipStatement()
    }
    this._parentAST.children.push(this._currentAST)
    this._currentAST = this._parentAST // go back up to parent
    this._parentAST = this._tree
  }

  private SkipStatement(): void {
    let bInQuotes = false
    let bInSingleQuotes = false
    const oldColumn = this._column

    if (
      this._column < this._line.length &&
      (this._line[this._column] == '{' ||
        this._line[this._column] == '}' ||
        this._line[this._column] == ':')
    ) {
      this._column++
    } else if (
      this._column < this._line.length &&
      (this._line[this._column] == '\\' || this._line[this._column] == ';')
    ) {
      this._column = this._line.length
    } else {
      while (
        this._column < this._line.length &&
        (bInQuotes || bInSingleQuotes || this.MoveToNextAtom(':;\\{}'))
      ) {
        if (
          this._column < this._line.length &&
          this._line[this._column] == '"' &&
          !bInSingleQuotes
        ) {
          // This handles quoted quotes in strings (like "a""b") because it views
          // them as two adjacent strings.
          bInQuotes = !bInQuotes
        } else if (
          this._column < this._line.length &&
          this._line[this._column] == "'"
        ) {
          if (bInSingleQuotes) {
            bInSingleQuotes = false
          } else if (
            this._column + 2 < this._line.length &&
            this._line[this._column + 2] == "'" &&
            !bInQuotes
          ) {
            bInSingleQuotes = true
            this._column++
          }
        }

        this._column++
      }
    }

    if (this._sourceCode.GetCurrentMacro() !== null) {
      let command = this._line.substring(oldColumn, this._column)

      if (this._column == this._line.length) {
        command += '\n'
      }
      this._sourceCode.GetCurrentMacro()?.AddLine(command)
    }
  }

  public EvaluateExpression(
    bAllowOneMismatchedCloseBracket = false,
  ): number | string {
    // Reset stacks
    this._valueStackPtr = 0
    this._operatorStackPtr = 0
    this._ASTValueStack = []
    this._ASTOpStack = []
    // Count brackets
    let bracketCount = 0
    // When we know a '(' is coming (because it was the end of a token) this is the number of commas to expect
    // in the parameter list, i.e. one less than the number of parameters.
    let pendingCommaCount = 0
    let expected = TYPE.VALUE_OR_UNARY
    // Iterate through the expression
    while (this.AdvanceAndCheckEndOfSubStatement(bracketCount == 0)) {
      if (expected == TYPE.VALUE_OR_UNARY) {
        // Look for unary operator
        let matchedToken = -1
        // Check against unary operator tokens
        for (let i = 0; i < LineParser._gaUnaryOperatorTable.length; i++) {
          const token = LineParser._gaUnaryOperatorTable[i].token
          const len = token.length
          // see if token matches
          let bMatch = true
          for (let j = 0; j < len; j++) {
            if (
              this._column + j >= this._line.length ||
              token[j] != this._line[this._column + j].toUpperCase()
            ) {
              bMatch = false
              break
            }
          }
          // it matches; advance line pointer and remember token
          if (bMatch) {
            matchedToken = i
            this._column += len
            // if token ends with (but is not) an open bracket, step backwards one place so that we parse it next time
            if (len > 1 && token[len - 1] == '(') {
              pendingCommaCount =
                LineParser._gaUnaryOperatorTable[matchedToken].parameterCount -
                1
              this._column--
              //assert( m_line[ m_column ] == '(' );
            }
            break
          }
        }
        if (matchedToken == -1) {
          // If unary operator not found, look for a value instead
          if (this._valueStackPtr == MAX_VALUES) {
            throw new AsmException.SyntaxError_ExpressionTooComplex(
              this._line,
              this._column,
            )
          }
          let value: number | string
          let isSymbol: boolean
          const ast = {
            type: ASTType.Value,
            value: '',
            startColumn: this._column,
            children: [],
            parent: null,
          }
          try {
            ;[value, isSymbol] = this.GetValue()
            if (isSymbol) {
              ast.type = ASTType.Symbol
            }
          } catch (e) {
            // If we encountered an unknown symbol whilst evaluation the expression...
            if (GlobalData.Instance.IsFirstPass()) {
              // On first pass, we have to continue gracefully.
              // This moves the string pointer to beyond the expression
              this.SkipExpression(bracketCount, bAllowOneMismatchedCloseBracket)
            }
            throw e
          }
          this._valueStack[this._valueStackPtr++] = value
          ast.value = this._line.substring(ast.startColumn, this._column)
          this._ASTValueStack.push(ast) // not using stack pointer, should be able to use push/pop
          expected = TYPE.BINARY
        } else {
          // If unary operator *was* found...
          const thisOp = LineParser._gaUnaryOperatorTable[matchedToken]
          const ast = {
            type: ASTType.UnaryOp,
            value: thisOp.token,
            startColumn: this._column - thisOp.token.length + 1,
            children: [] as AST[],
            parent: null,
          }
          if (thisOp.handler !== '') {
            // not an open bracket - we may have to juggle the stack
            while (
              this._operatorStackPtr > 0 &&
              thisOp.precedence <
              this._operatorStack[this._operatorStackPtr - 1].precedence
            ) {
              this._operatorStackPtr--
              const opHandler =
                this._operatorStack[this._operatorStackPtr].handler
              if (opHandler === '') {
                // mismatched brackets
                throw new AsmException.SyntaxError_MismatchedParentheses(
                  this._line,
                  this._column,
                )
              } else {
                // pull value(s) off the stack and set as children to ast
                for (let i = 0; i < Math.max(1, thisOp.parameterCount); i++) {
                  const tmp = this._ASTValueStack.pop()
                  if (tmp !== undefined) {
                    ast.children.push(tmp)
                  }
                }
                this._ASTOpStack.push(ast)
                // execute the operator to combine values from the stack and push result back on stack
                this.Execute(opHandler)
              }
            }
          } else {
            // The open bracket's parameterCount counts down the number of commas expected.
            thisOp.parameterCount = pendingCommaCount
            pendingCommaCount = 0
            bracketCount++
          }
          if (this._operatorStackPtr == MAX_OPERATORS) {
            throw new AsmException.SyntaxError_ExpressionTooComplex(
              this._line,
              this._column,
            )
          }
          this._ASTOpStack.push(ast)
          this._operatorStack[this._operatorStackPtr++] = thisOp
        }
      } else {
        // Get binary operator
        let matchedToken = -1
        for (let i = 0; i < LineParser._gaBinaryOperatorTable.length; i++) {
          const token = LineParser._gaBinaryOperatorTable[i].token
          const len = token.length
          // see if token matches
          let bMatch = true
          for (let j = 0; j < len; j++) {
            if (token[j] != this._line[this._column + j].toUpperCase()) {
              bMatch = false
              break
            }
          }
          // it matches; advance line pointer and remember token
          if (bMatch) {
            matchedToken = i
            this._column += len
            break
          }
        }
        if (matchedToken === -1) {
          throw new AsmException.SyntaxError_InvalidCharacter(
            this._line,
            this._column,
          )
        }
        // we found binary operator
        const thisOp = LineParser._gaBinaryOperatorTable[matchedToken]
        if (thisOp.handler !== '') {
          // not a close bracket
          const ast = {
            type: ASTType.BinaryOp,
            value: thisOp.token,
            startColumn: this._column,
            children: [] as AST[],
            parent: null,
          }
          while (
            this._operatorStackPtr > 0 &&
            thisOp.precedence <=
            this._operatorStack[this._operatorStackPtr - 1].precedence
          ) {
            this._operatorStackPtr--
            const opHandler =
              this._operatorStack[this._operatorStackPtr].handler
            // assert ( opHandler == !null ); // this means the operator has been given a precedence of < 0
            // pull value(s) off the stack and set as children to ast
            for (let i = 0; i < 2; i++) {
              const tmp = this._ASTValueStack.pop()
              if (tmp !== undefined) {
                ast.children.push(tmp)
              }
            }
            // execute the operator to combine values from the stack and push result back on stack
            this.Execute(opHandler)
          }

          if (this._operatorStackPtr == MAX_OPERATORS) {
            throw new AsmException.SyntaxError_ExpressionTooComplex(
              this._line,
              this._column,
            )
          }
          this._operatorStack[this._operatorStackPtr++] = thisOp
          this._ASTOpStack.push(ast)
          expected = TYPE.VALUE_OR_UNARY
        } else {
          // is a close bracket or parameter separator
          const separator = thisOp.token == ','
          if (!separator) {
            bracketCount--
          }
          let bFoundMatchingBracket = false
          while (this._operatorStackPtr > 0) {
            this._operatorStackPtr--
            const ast = this._ASTOpStack.pop()
            const opHandler =
              this._operatorStack[this._operatorStackPtr].handler
            if (opHandler !== '') {
              if (ast !== undefined) {
                // should never be undefined but have to for type checking
                let numParams: number
                // check if operator is unary or binary (hacky to use precedence, but it works for now)
                if (ast.type === ASTType.BinaryOp) {
                  numParams = 2 // binary operator
                } else {
                  numParams = Math.max(
                    1,
                    this._operatorStack[this._operatorStackPtr].parameterCount,
                  ) // unary operator
                }
                // pull value(s) off the stack and set as children to ast
                for (let i = 0; i < 2; i++) {
                  const tmp = this._ASTValueStack.pop()
                  if (tmp !== undefined) {
                    ast.children.push(tmp)
                  }
                }
                this._ASTValueStack.push(ast)
              }
              // execute the operator to combine values from the stack and push result back on stack
              this.Execute(opHandler)
            } else {
              bFoundMatchingBracket = true
              break
            }
          }
          if (bFoundMatchingBracket) {
            if (separator) {
              // parameter separator
              // check we are expecting multiple parameters
              if (
                this._operatorStack[this._operatorStackPtr].parameterCount == 0
              ) {
                throw new AsmException.SyntaxError_ParameterCount(
                  this._line,
                  this._column - 1,
                )
              }
              this._operatorStack[this._operatorStackPtr].parameterCount--
              // put the open bracket back on the stack
              this._operatorStackPtr++
              // expect the next parameter
              expected = TYPE.VALUE_OR_UNARY
            } else {
              // close par
              // check all parameters have been supplied
              if (
                this._operatorStack[this._operatorStackPtr].parameterCount != 0
              ) {
                throw new AsmException.SyntaxError_ParameterCount(
                  this._line,
                  this._column - 1,
                )
              }
            }
          } else {
            // did not find matching bracket
            if (bAllowOneMismatchedCloseBracket) {
              // this is a hack which allows an extra close bracket to terminate an expression,
              // so that we can parse LDA (ind),Y and JMP (ind) where the open bracket is not
              // included in the expression
              this._column--
              break // jump out of the loop, ready to exit
            } else {
              // mismatched brackets
              throw new AsmException.SyntaxError_MismatchedParentheses(
                this._line,
                this._column - 1,
              )
            }
          }
        }
      }
    }
    // purge the operator stack
    while (this._operatorStackPtr > 0) {
      this._operatorStackPtr--
      const opHandler = this._operatorStack[this._operatorStackPtr].handler
      if (opHandler === '') {
        // mismatched brackets
        throw new AsmException.SyntaxError_MismatchedParentheses(
          this._line,
          this._column,
        )
      } else {
        // const ast = { type: ASTType.BinaryOp, value: this._operatorStack[this._operatorStackPtr].token, startColumn: this._column, children: [] as AST[], parent: null };
        const ast = this._ASTOpStack.pop()
        if (ast !== undefined) {
          let numParams: number
          // check if operator is unary or binary (hacky to use precedence, but it works for now)
          if (ast.type === ASTType.BinaryOp) {
            numParams = 2 // binary operator
          } else {
            numParams = Math.max(
              1,
              this._operatorStack[this._operatorStackPtr].parameterCount,
            ) // unary operator
          }
          // pull value(s) off the stack and set as children to ast
          for (let i = 0; i < numParams; i++) {
            const tmp = this._ASTValueStack.pop()
            if (tmp !== undefined) {
              ast.children.push(tmp)
            }
          }
          this._ASTValueStack.push(ast)
        }
        // execute the operator to combine values from the stack and push result back on stack
        this.Execute(opHandler)
      }
    }
    // assert( m_valueStackPtr <= 1 );
    if (this._valueStackPtr == 0) {
      // nothing was found
      throw new AsmException.SyntaxError_EmptyExpression(
        this._line,
        this._column,
      )
    }
    return this._valueStack[0]
  }

  private EvaluateExpressionAsInt(
    bAllowOneMismatchedCloseBracket = false,
  ): number {
    const value = this.EvaluateExpression(bAllowOneMismatchedCloseBracket)
    if (typeof value === 'number') {
      return Math.trunc(value)
    } else {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
  }

  private EvaluateExpressionAsDouble(
    bAllowOneMismatchedCloseBracket = false,
  ): number {
    const value = this.EvaluateExpression(bAllowOneMismatchedCloseBracket)
    if (typeof value === 'number') {
      return value
    } else {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
  }

  private EvaluateExpressionAsString(
    bAllowOneMismatchedCloseBracket = false,
  ): string {
    const value = this.EvaluateExpression(bAllowOneMismatchedCloseBracket)
    if (typeof value === 'string') {
      return value
    } else {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
  }

  private SkipExpression(
    bracketCount: integer,
    bAllowOneMismatchedCloseBracket: boolean,
  ): void {
    while (this.AdvanceAndCheckEndOfSubStatement(bracketCount == 0)) {
      if (this._line[this._column] == '(') {
        bracketCount++
      } else if (this._line[this._column] == ')') {
        bracketCount--
        if (bAllowOneMismatchedCloseBracket && bracketCount < 0) {
          break
        }
      }
      this._column++
    }
  }

  private GetValue(): [number | string, boolean] {
    let value: number | string
    let double_value: number
    let canParse: boolean
    let isSymbol = false
      ;[canParse, this._column, double_value] = this.ParseNumeric(
        this._line,
        this._column,
      )
    if (canParse) {
      value = double_value
    } else if (
      this._column < this._line.length &&
      this._line[this._column] == '*'
    ) {
      // get current PC
      this._column++
      value = ObjectCode.Instance.GetPC()
      // value = 0; // Don't track PC
    } else if (
      this._column < this._line.length &&
      this._line[this._column] == "'"
    ) {
      // get char literal
      if (
        this._line.length - this._column < 3 ||
        this._line[this._column + 2] != "'"
      ) {
        // bad syntax - must be e.g. 'A'
        throw new AsmException.SyntaxError_InvalidCharacter(
          this._line,
          this._column,
        )
      }
      value = this._line[this._column + 1].charCodeAt(0)
      this._column += 3
    } else if (
      this._column < this._line.length &&
      this._line[this._column] == '"'
    ) {
      // get string literal
      const text: string[] = []
      this._column++
      let done = false
      while (!done && this._column < this._line.length) {
        const c: string = this._line[this._column]
        this._column++
        if (c == '"') {
          if (
            this._column < this._line.length &&
            this._line[this._column] == '"'
          ) {
            // Quote quoted by doubling
            text.push(c)
            this._column++
          } else {
            done = true
          }
        } else {
          text.push(c)
        }
      }
      if (!done) {
        // throw new AsmException.SyntaxError_MissingQuote( this._line, this._line.length );
      }
      value = text.join('')
    } else if (
      this._column < this._line.length &&
      (isalpha(this._line[this._column]) || this._line[this._column] == '_')
    ) {
      // get a symbol
      const oldColumn: number = this._column
      const symbolName: string = this.GetSymbolName()
      if (symbolName == 'TIME$') {
        // Handle TIME$ with no parameters
        value = this.FormatAssemblyTime('%a,%d %b %Y.%H:%M:%S')
      } else {
        // Regular symbol
        const location: Location = {
          uri: this._sourceCode.GetURI(),
          range: {
            start: {
              line: this._lineno,
              character: this._column - symbolName.length,
            },
            end: { line: this._lineno, character: this._column },
          },
        }
        let hasValue: boolean
          ;[hasValue, value] = this._sourceCode.GetSymbolValue(
            symbolName,
            location,
          )
        if (!hasValue) {
          // symbol not known
          throw new AsmException.SyntaxError_SymbolNotDefined(
            this._line,
            oldColumn,
          )
        }
        isSymbol = true
      }
    } else {
      // expected value
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
      value = 'Syntax Error: Invalid Character'
    }
    return [value, isSymbol]
  }

  private ParseNumeric(
    line: string,
    index: integer,
  ): [boolean, integer, number] {
    // CHANGED FROM C++ LITERALS MODULE SINCE SO MANY PARSE BY REFERENCE PARAMETERS THERE
    // Want to increment column and set numeric value as well as true/false for success
    let result = 0
    const old_index = index
    if (index >= line.length) {
      return [false, old_index, result]
    }
    if (
      is_decimal_digit(line[index]) ||
      line[index] == '.' ||
      line[index] == '-'
    ) {
      // Copy the number without underscores to this buffer
      let buffer = ''
      if (line[index] == '-') {
        buffer += '-'
        index++
      }
      // Copy digits preceding decimal point
      let have_digits: boolean
      let have_digits_post = false
        ;[have_digits, index, buffer] = this.CopyDigitsSkippingUnderscores(
          line,
          index,
          buffer,
        )
      // Copy decimal point
      if (index < line.length && line[index] == '.') {
        buffer += line[index]
        index++
          // Copy digits after decimal point
          ;[have_digits_post, index, buffer] = this.CopyDigitsSkippingUnderscores(
            line,
            index,
            buffer,
          )
      }
      if (!(have_digits || have_digits_post)) {
        // A decimal point with no number will cause this
        // throw new AsmException.SyntaxError_InvalidCharacter( line, index );
      }
      // Copy exponent if it's followed by a sign or digit
      if (
        index + 1 < line.length &&
        (line[index] == 'e' || line[index] == 'E') &&
        (line[index + 1] == '+' ||
          line[index + 1] == '-' ||
          is_decimal_digit(line[index + 1]))
      ) {
        buffer += 'e'
        index++
        if (line[index] == '+' || line[index] == '-') {
          buffer += line[index]
          index++
        }
        let have_digits_exp: boolean
          ;[have_digits_exp, index, buffer] = this.CopyDigitsSkippingUnderscores(
            line,
            index,
            buffer,
          )
        if (!have_digits_exp) {
          // Exponent needs a value
          // throw new AsmException.SyntaxError_InvalidCharacter( line, index );
        }
      }
      result = parseFloat(buffer)

      return [true, index, result]
    } else if (line[index] == '&' || line[index] == '$') {
      // get hexadecimal
      // skip the number prefix
      index++
      let can_parse: boolean
        ;[can_parse, index, result] = this.ParseInteger(line, index, 16, 8)
      if (!can_parse) {
        // badly formed hex literal
        // throw new AsmException.SyntaxError_BadHex( line, index );
      }
      return [true, index, result]
    } else if (line[index] == '%') {
      // get binary
      // skip the number prefix
      index++
      let can_parse: boolean
        ;[can_parse, index, result] = this.ParseInteger(line, index, 2, 32)
      if (!can_parse) {
        // badly formed bin literal
        // throw new AsmException.SyntaxError_BadBin( line, index );
      }
      return [true, index, result]
    }
    return [false, old_index, result]
  }

  private ParseInteger(
    line: string,
    index: integer,
    base: integer,
    max_digits: integer,
  ): [boolean, integer, integer] {
    const old_index = index
    let result: integer = 0
    const start_column = index
    // Check there's something and it doesn't start with an underscore
    if (index == line.length || line[index] == '_') {
      return [false, old_index, result]
    }
    // Skip leading zeroes
    while (index < line.length && (line[index] == '0' || line[index] == '_')) {
      index++
    }
    let value = 0
    let digit_count = 0
    while (index < line.length) {
      if (line[index] == '_') {
        // Don't allow two in a row; there must be a previous char because
        // we can't start with an underscore
        if (line[index - 1] == '_') {
          return [false, old_index, result]
        }
      } else {
        const digit = hex_digit_value(line[index])
        if (digit < 0 || digit >= base) {
          break
        }
        value = value * base + digit
        digit_count++
      }
      index++
    }
    // Check we found something, it wasn't too long and it didn't end on an underscore
    if (
      index == start_column ||
      digit_count > max_digits ||
      line[index - 1] == '_'
    ) {
      return [false, old_index, result]
    }
    result = value
    return [true, index, result]
  }

  // Copy decimal digits to a buffer, skipping single underscores that appear between digits.
  // Throw an exception for underscores at the beginning or end or paired.
  // Return false if there were no digits.
  private CopyDigitsSkippingUnderscores(
    line: string,
    index: integer,
    buffer: string,
  ): [boolean, integer, string] {
    let new_buffer = buffer
    if (index < line.length && line[index] == '_') {
      // Number can't start with an underscore
      // throw new AsmException.SyntaxError_InvalidCharacter(line, index);
    }
    const start_index = index
    while (
      index < line.length &&
      (is_decimal_digit(line[index]) || line[index] == '_')
    ) {
      if (line[index] == '_') {
        // Don't allow two in a row; there must be a previous char because
        // we can't start with an underscore
        if (line[index - 1] == '_') {
          // throw new AsmException.SyntaxError_InvalidCharacter(line, index);
        }
      } else {
        new_buffer += line[index]
      }
      index++
    }
    if (index > start_index && line[index - 1] == '_') {
      // Can't end on an underscore
      // throw new AsmException.SyntaxError_InvalidCharacter(line, index);
    }
    return [index != start_index, index, new_buffer]
  }

  private HasAddressingMode(
    instructionIndex: integer,
    mode: ADDRESSING_MODE,
  ): boolean {
    const i = LineParser._gaOpcodeTable[instructionIndex].opcodes[mode]
    return i !== -1 && (i & 0xff00) <= ObjectCode.Instance.GetCPU() << 8
  }

  private HandleAssembler(instruction: integer): void {
    let oldColumn = this._column

    if (!this.AdvanceAndCheckEndOfStatement()) {
      // there is nothing following the opcode - maybe implied mode... see if this is allowed!
      if (this.HasAddressingMode(instruction, ADDRESSING_MODE.IMP)) {
        // It's allowed - assemble this instruction
        this.Assemble1(instruction, ADDRESSING_MODE.IMP, 0)
        return
      } else {
        // Implied addressing mode not allowed
        throw new AsmException.SyntaxError_NoImplied(this._line, oldColumn)
      }
    }
    // OK, something follows... maybe it's immediate mode
    if (this._column < this._line.length && this._line[this._column] == '#') {
      if (!this.HasAddressingMode(instruction, ADDRESSING_MODE.IMM)) {
        // Immediate addressing mode not allowed
        throw new AsmException.SyntaxError_NoImmediate(this._line, oldColumn)
      }
      this._column++
      oldColumn = this._column
      let value = 0
      try {
        value = this.EvaluateExpressionAsInt()
      } catch (e) {
        if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
          if (GlobalData.Instance.IsFirstPass()) {
            value = 0
          } else {
            throw e
          }
        }
      }
      if (value > 0xff) {
        // Immediate constant too large
        throw new AsmException.SyntaxError_ImmTooLarge(this._line, oldColumn)
      }
      if (value < 0) {
        // Immediate constant is negative
        throw new AsmException.SyntaxError_ImmNegative(this._line, oldColumn)
      }
      if (this._column < this._line.length && this._line[this._column] == ',') {
        // Unexpected comma (remembering that an expression can validly end with a comma)
        throw new AsmException.SyntaxError_UnexpectedComma(
          this._line,
          this._column,
        )
      }
      // Actually assemble the instruction
      this.Assemble2(instruction, ADDRESSING_MODE.IMM, value, 0)
      return
    }
    // see if it's accumulator mode
    if (
      this._column < this._line.length &&
      this._line[this._column].toUpperCase() == 'A' &&
      this.HasAddressingMode(instruction, ADDRESSING_MODE.ACC)
    ) {
      // might be... but only if the next character is a separator or whitespace
      // otherwise, we must assume a label beginning with A
      const rememberColumn = this._column
      this._column++
      if (!this.AdvanceAndCheckEndOfStatement()) {
        // It is definitely accumulator mode - assemble this instruction
        this.Assemble1(instruction, ADDRESSING_MODE.ACC, rememberColumn)
        return
      } else {
        // No - restore pointer so we can consider 'A' as the start of a label name later
        this._column = rememberColumn
      }
    }
    // see if it's (ind,X), (ind),Y or (ind16)
    if (this._column < this._line.length && this._line[this._column] == '(') {
      oldColumn = this._column
      this._column++
      let value = 0
      try {
        // passing true to EvaluateExpression is a hack which allows us to terminate the expression by
        // an extra close bracket.
        value = this.EvaluateExpressionAsInt(true)
      } catch (e) {
        if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
          if (GlobalData.Instance.IsFirstPass()) {
            value = 0
          } else {
            throw e
          }
        } else throw e
      }
      // the only valid character to find here is ',' for (ind,X) or (ind16,X) and ')' for (ind),Y or (ind16) or (ind)
      // we know that ind and ind16 forms are exclusive
      // check (ind), (ind16) and (ind),Y
      if (this._column < this._line.length && this._line[this._column] == ')') {
        this._column++
        // check (ind) and (ind16)
        if (!this.AdvanceAndCheckEndOfStatement()) {
          // nothing else here - must be ind or ind16... see if this is allowed!
          if (this.HasAddressingMode(instruction, ADDRESSING_MODE.IND16)) {
            // It is definitely ind16 mode - check for the 6502 bug
            if ((value & 0xff) == 0xff) {
              // victim of the 6502 bug!  throw an error
              throw new AsmException.SyntaxError_6502Bug(
                this._line,
                oldColumn + 1,
              )
            }
            this.Assemble3(instruction, ADDRESSING_MODE.IND16, value, 0)
            return
          }

          if (!this.HasAddressingMode(instruction, ADDRESSING_MODE.IND)) {
            throw new AsmException.SyntaxError_NoIndirect(this._line, oldColumn)
          }
          // assemble (ind) instruction
          if (value > 0xff) {
            // it's not ZP and it must be
            throw new AsmException.SyntaxError_NotZeroPage(
              this._line,
              oldColumn + 1,
            )
          }
          if (value < 0) {
            throw new AsmException.SyntaxError_BadAddress(
              this._line,
              oldColumn + 1,
            )
          }
          this.Assemble2(instruction, ADDRESSING_MODE.IND, value, 0)
          return
        }
        // if we find ,Y then it's an (ind),Y
        if (
          this._column < this._line.length &&
          this._line[this._column] == ','
        ) {
          this._column++
          if (!this.AdvanceAndCheckEndOfStatement()) {
            // We expected more characters but there were none
            throw new AsmException.SyntaxError_BadIndirect(
              this._line,
              this._column,
            )
          }
          if (this._line[this._column].toUpperCase() != 'Y') {
            // We were expecting a Y
            throw new AsmException.SyntaxError_BadIndirect(
              this._line,
              this._column,
            )
          }
          this._column++
          if (this.AdvanceAndCheckEndOfStatement()) {
            // We were not expecting any more characters
            throw new AsmException.SyntaxError_BadIndirect(
              this._line,
              this._column,
            )
          }
          // It is definitely (ind),Y - check we can use it
          if (!this.HasAddressingMode(instruction, ADDRESSING_MODE.INDY)) {
            // addressing mode not allowed
            throw new AsmException.SyntaxError_NoIndirect(this._line, oldColumn)
          }
          // assemble (ind),Y instruction
          if (value > 0xff) {
            // it's not ZP and it must be
            throw new AsmException.SyntaxError_NotZeroPage(
              this._line,
              oldColumn + 1,
            )
          }
          if (value < 0) {
            throw new AsmException.SyntaxError_BadAddress(
              this._line,
              oldColumn + 1,
            )
          }
          this.Assemble2(
            instruction,
            ADDRESSING_MODE.INDY,
            value,
            this._column - 1,
          )
          return
        }
        // If we got here, we identified neither (ind16) nor (ind),Y
        // Therefore we throw a syntax error
        throw new AsmException.SyntaxError_BadIndirect(this._line, this._column)
      }
      if (this._column < this._line.length && this._line[this._column] == ',') {
        this._column++
        if (!this.AdvanceAndCheckEndOfStatement()) {
          // We expected more characters but there were none
          throw new AsmException.SyntaxError_BadIndirect(
            this._line,
            this._column,
          )
        }
        if (this._line[this._column].toUpperCase() != 'X') {
          // We were expecting an X
          throw new AsmException.SyntaxError_BadIndirect(
            this._line,
            this._column,
          )
        }
        this._column++
        if (!this.AdvanceAndCheckEndOfStatement()) {
          // We were not expecting any more characters
          throw new AsmException.SyntaxError_BadIndirect(
            this._line,
            this._column,
          )
        }
        if (this._line[this._column] != ')') {
          // We were expecting a close bracket
          throw new AsmException.SyntaxError_MismatchedParentheses(
            this._line,
            this._column,
          )
        }
        this._column++
        if (this.AdvanceAndCheckEndOfStatement()) {
          // We were not expecting any more characters
          throw new AsmException.SyntaxError_BadIndirect(
            this._line,
            this._column,
          )
        }
        if (this.HasAddressingMode(instruction, ADDRESSING_MODE.IND16X)) {
          // It is definitely ind16,x mode
          this.Assemble3(
            instruction,
            ADDRESSING_MODE.IND16X,
            value,
            this._column - 2,
          )
          return
        }
        // It is definitely (ind,X) - check we can use it
        if (!this.HasAddressingMode(instruction, ADDRESSING_MODE.INDX)) {
          // addressing mode not allowed
          throw new AsmException.SyntaxError_NoIndirect(this._line, oldColumn)
        }
        // It is definitely (ind,X) - assemble this instruction
        if (value > 0xff) {
          // it's not ZP and it must be
          throw new AsmException.SyntaxError_NotZeroPage(
            this._line,
            oldColumn + 1,
          )
        }
        if (value < 0) {
          throw new AsmException.SyntaxError_BadAddress(
            this._line,
            oldColumn + 1,
          )
        }
        this.Assemble2(
          instruction,
          ADDRESSING_MODE.INDX,
          value,
          this._column - 2,
        )
        return
      }
      // If we got here, we identified none of (ind), (ind16), (ind,X), (ind16,X) or (ind),Y
      // Therefore we throw a syntax error
      throw new AsmException.SyntaxError_BadIndirect(this._line, this._column)
    }

    // if we got here, it must be abs abs,X abs,Y zp zp,X or zp,Y
    // we give priority to trying to match zp as they are the preference
    // get the address operand
    oldColumn = this._column
    let value = 0
    try {
      value = this.EvaluateExpressionAsInt()
      // If this is relative addressing and we're on the first pass, we don't
      // use the value we just calculated. This is because we may have
      // successfully evaluated the expression but obtained the wrong value
      // because it's intended as a forward reference to a local label but
      // there's an earlier definition in an outer scope - value would evaluate
      // successfully to use the wrong label, and we might get a spurious branch
      // out of range error. See local-forward-branch-1.6502 for an example.
      if (
        this.HasAddressingMode(instruction, ADDRESSING_MODE.REL) &&
        GlobalData.Instance.IsFirstPass()
      ) {
        value = ObjectCode.Instance.GetPC()
      }
    } catch (e) {
      if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
        if (GlobalData.Instance.IsFirstPass()) {
          // this allows branches to assemble when the value is unknown due to a label not having
          // yet been defined.  Also, this is most likely a 16-bit value, which is a sensible
          // default addressing mode to assume.
          value = ObjectCode.Instance.GetPC()
        } else {
          throw e
        }
      } else {
        throw e
      }
    }
    if (!this.AdvanceAndCheckEndOfStatement()) {
      // end of this instruction
      // see if this is relative addressing (branch)
      if (this.HasAddressingMode(instruction, ADDRESSING_MODE.REL)) {
        const branchAmount = value - (ObjectCode.Instance.GetPC() + 2)
        if (branchAmount < -128) {
          throw new AsmException.SyntaxError_BranchOutOfRange(
            this._line,
            oldColumn,
          )
        } else if (branchAmount > 127) {
          throw new AsmException.SyntaxError_BranchOutOfRange(
            this._line,
            oldColumn,
          )
        } else {
          this.Assemble2(
            instruction,
            ADDRESSING_MODE.REL,
            branchAmount & 0xff,
            0,
          )
          return
        }
      }
      // else this must be abs or zp
      // we assemble abs or zp depending on whether 'value' is a 16- or 8-bit number.
      // we contrive that unknown labels will get a 16-bit value so that absolute addressing is the default.
      if (value < 0 || value > 0xffff) {
        throw new AsmException.SyntaxError_BadAddress(this._line, oldColumn)
      }
      if (
        value < 0x100 &&
        this.HasAddressingMode(instruction, ADDRESSING_MODE.ZP)
      ) {
        this.Assemble2(instruction, ADDRESSING_MODE.ZP, value, 0)
        return
      } else if (this.HasAddressingMode(instruction, ADDRESSING_MODE.ABS)) {
        this.Assemble3(instruction, ADDRESSING_MODE.ABS, value, 0)
        return
      } else {
        throw new AsmException.SyntaxError_NoAbsolute(this._line, oldColumn)
      }
    }
    // finally, check for indexed versions of the opcode
    if (this._column >= this._line.length || this._line[this._column] != ',') {
      // weird character - throw error
      throw new AsmException.SyntaxError_BadAbsolute(this._line, this._column)
    }
    this._column++
    if (!this.AdvanceAndCheckEndOfStatement()) {
      // We expected more characters but there were none
      throw new AsmException.SyntaxError_BadAbsolute(this._line, this._column)
    }
    if (
      this._column < this._line.length &&
      this._line[this._column].toUpperCase() == 'X'
    ) {
      this._column++
      if (this.AdvanceAndCheckEndOfStatement()) {
        // We were not expecting any more characters
        throw new AsmException.SyntaxError_BadIndexed(this._line, this._column)
      }
      if (value < 0 || value > 0xffff) {
        throw new AsmException.SyntaxError_BadAddress(this._line, oldColumn)
      }
      if (
        value < 0x100 &&
        this.HasAddressingMode(instruction, ADDRESSING_MODE.ZPX)
      ) {
        this.Assemble2(
          instruction,
          ADDRESSING_MODE.ZPX,
          value,
          this._column - 1,
        )
        return
      } else if (this.HasAddressingMode(instruction, ADDRESSING_MODE.ABSX)) {
        this.Assemble3(
          instruction,
          ADDRESSING_MODE.ABSX,
          value,
          this._column - 1,
        )
        return
      } else {
        throw new AsmException.SyntaxError_NoIndexedX(this._line, oldColumn)
      }
    }
    if (
      this._column < this._line.length &&
      this._line[this._column].toUpperCase() == 'Y'
    ) {
      this._column++
      if (this.AdvanceAndCheckEndOfStatement()) {
        // We were not expecting any more characters
        throw new AsmException.SyntaxError_BadIndexed(this._line, this._column)
      }
      if (value < 0 || value > 0xffff) {
        throw new AsmException.SyntaxError_BadAddress(this._line, oldColumn)
      }
      if (
        value < 0x100 &&
        this.HasAddressingMode(instruction, ADDRESSING_MODE.ZPY)
      ) {
        this.Assemble2(
          instruction,
          ADDRESSING_MODE.ZPY,
          value,
          this._column - 1,
        )
        return
      } else if (this.HasAddressingMode(instruction, ADDRESSING_MODE.ABSY)) {
        this.Assemble3(
          instruction,
          ADDRESSING_MODE.ABSY,
          value,
          this._column - 1,
        )
        return
      } else {
        throw new AsmException.SyntaxError_NoIndexedY(this._line, oldColumn)
      }
    }
    // If we got here, we received a weird index, like LDA addr,Z
    throw new AsmException.SyntaxError_BadIndexed(this._line, this._column)
  }

  private Assemble1(
    instructionIndex: integer,
    mode: ADDRESSING_MODE,
    registerPosition: integer,
  ): void {
    const opcode = this.GetOpcode(instructionIndex, mode)
    try {
      ObjectCode.Instance.Assemble1(opcode)
    } catch (e) {
      if (e instanceof AsmException.AssembleError) {
        e.SetColumn(this._column)
        e.SetString(this._line)
        throw e
      }
    }
    this._currentAST.value = opcode // Rewrite as using this as index into hover text
    if (mode == ADDRESSING_MODE.ACC) {
      this._currentAST.children.push({
        type: ASTType.Value,
        value: 'A',
        startColumn: registerPosition,
        children: [],
      })
    }
    this._parentAST = this._tree
  }

  private Assemble2(
    instructionIndex: integer,
    mode: ADDRESSING_MODE,
    value: integer,
    registerPosition: integer,
  ): void {
    const opcode = this.GetOpcode(instructionIndex, mode)
    try {
      ObjectCode.Instance.Assemble2(opcode, value)
    } catch (e) {
      if (e instanceof AsmException.AssembleError) {
        e.SetString(this._line)
        e.SetColumn(this._column)
        throw e
      }
    }
    this._currentAST.value = opcode
    this._currentAST.children.push(this._ASTValueStack[0])
    if (mode == ADDRESSING_MODE.ZPX || mode == ADDRESSING_MODE.INDX) {
      this._currentAST.children.push({
        type: ASTType.Value,
        value: 'X',
        startColumn: registerPosition,
        children: [],
      })
    }
    if (mode == ADDRESSING_MODE.ZPY || mode == ADDRESSING_MODE.INDY) {
      this._currentAST.children.push({
        type: ASTType.Value,
        value: 'Y',
        startColumn: registerPosition,
        children: [],
      })
    }
    this._parentAST = this._tree
  }

  Assemble3(
    instructionIndex: integer,
    mode: ADDRESSING_MODE,
    value: integer,
    registerPosition: integer,
  ): void {
    const opcode = this.GetOpcode(instructionIndex, mode)
    try {
      ObjectCode.Instance.Assemble3(opcode, value)
    } catch (e) {
      if (e instanceof AsmException.AssembleError) {
        e.SetString(this._line)
        e.SetColumn(this._column)
        throw e
      }
    }
    this._currentAST.value = opcode
    this._currentAST.children.push(this._ASTValueStack[0])
    if (mode == ADDRESSING_MODE.ABSX || mode == ADDRESSING_MODE.IND16X) {
      this._currentAST.children.push({
        type: ASTType.Value,
        value: 'X',
        startColumn: registerPosition,
        children: [],
      })
    }
    if (mode == ADDRESSING_MODE.ABSY) {
      this._currentAST.children.push({
        type: ASTType.Value,
        value: 'Y',
        startColumn: registerPosition,
        children: [],
      })
    }
    this._parentAST = this._tree
  }

  private GetOpcode(instructionIndex: integer, mode: ADDRESSING_MODE): integer {
    const i = LineParser._gaOpcodeTable[instructionIndex].opcodes[mode]
    return i & 0xff
  }

  private StackTopInt(): integer {
    return Math.floor(this.StackTopNumber())
  }

  private StackTopString(): string {
    if (this._valueStackPtr < 1) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value = this._valueStack[this._valueStackPtr - 1]
    if (typeof value !== 'string') {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    return value
  }

  private StackTopNumber(): number {
    if (this._valueStackPtr < 1) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value = this._valueStack[this._valueStackPtr - 1]
    if (typeof value !== 'number') {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    return value
  }

  private StackTopTwoValues(): [number | string, number | string] {
    if (this._valueStackPtr < 2) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value1 = this._valueStack[this._valueStackPtr - 2]
    const value2 = this._valueStack[this._valueStackPtr - 1]
    if (typeof value1 != typeof value2) {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    return [value1, value2]
  }

  private StackTopTwoNumbers(): [number, number] {
    if (this._valueStackPtr < 2) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value1 = this._valueStack[this._valueStackPtr - 2]
    const value2 = this._valueStack[this._valueStackPtr - 1]
    if (typeof value1 !== 'number' && typeof value2 !== 'number') {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    return [value1 as number, value2 as number]
  }

  private FormatAssemblyTime(formatString: string) {
    const t = GlobalData.Instance.GetAssemblyTime()
    const ts = strftime(formatString, t)
    if (ts.length > 256) {
      throw new AsmException.SyntaxError_TimeResultTooBig(
        this._line,
        this._column,
      )
    }
    return ts
  }

  private HandleDefineLabel(): void {
    if (this._column >= this._line.length) {
      throw new AsmException.SyntaxError_InvalidSymbolName(
        this._line,
        this._column,
      )
    }
    const initialColumn = this._column
    const first_char = this._line[this._column]
    let target_level = this._sourceCode.GetForLevel()
    if (first_char === '*') {
      this._column++
      target_level = 0
    } else if (first_char === '^') {
      this._column++
      target_level = Math.max(target_level - 1, 0)
    }
    // '*' and '^' may not cause a label to be defined outside the current macro expansion.
    if (target_level < this._sourceCode.GetInitialForStackPtr()) {
      throw new AsmException.SyntaxError_SymbolScopeOutsideMacro(
        this._line,
        initialColumn,
      )
    }
    // '*' and '^' may not cause a label to be defined outside the current for loop; note that
    // this loop is a no-op for ordinary labels where target_level == m_sourceCode->GetForLevel().
    for (
      let level = this._sourceCode.GetForLevel();
      level > target_level;
      level--
    ) {
      if (this._sourceCode.IsRealForLevel(level)) {
        throw new AsmException.SyntaxError_SymbolScopeOutsideFor(
          this._line,
          initialColumn,
        )
      }
    }
    if (
      this._column < this._line.length &&
      (isalpha(this._line[this._column]) || this._line[this._column] == '_')
    ) {
      // Symbol starts with a valid character
      const oldColumn = this._column
      // Get the symbol name
      const symbolName = this.GetSymbolName()
      // ...and mangle it according to whether we are in a FOR loop
      const fullSymbolName =
        symbolName + this._sourceCode.GetSymbolNameSuffix(target_level)
      if (GlobalData.Instance.IsFirstPass()) {
        // only add the symbol on the first pass
        if (SymbolTable.Instance.IsSymbolDefined(fullSymbolName)) {
          throw new AsmException.SyntaxError_LabelAlreadyDefined(
            this._line,
            oldColumn,
          )
        } else {
          const loc = {
            uri: this._sourceCode.GetURI(),
            range: {
              start: { line: this._lineno, character: oldColumn },
              end: { line: this._lineno, character: this._column },
            },
          }
          SymbolTable.Instance.AddSymbol(
            fullSymbolName,
            ObjectCode.Instance.GetPC(),
            loc,
            true,
          )
        }
      } else {
        // on the second pass, check that the label would be assigned the same numeric value
        const value = SymbolTable.Instance.GetSymbol(fullSymbolName)
        if (
          typeof value !== 'number' ||
          value !== ObjectCode.Instance.GetPC()
        ) {
          throw new AsmException.SyntaxError_SecondPassProblem(
            this._line,
            oldColumn,
          )
        }
        SymbolTable.Instance.AddLabel(symbolName)
      }
    } else {
      throw new AsmException.SyntaxError_InvalidSymbolName(
        this._line,
        this._column,
      )
    }
  }

  private HandleDefineComment(): void {
    // skip rest of line
    this._column = this._line.length
  }
  private HandleStatementSeparator(): void {
    /* do nothing! */
  }

  private HandlePrint(): void {
    let demandComma = false
    while (this.AdvanceAndCheckEndOfStatement()) {
      if (this._line[this._column] === ',') {
        // print separator - skip
        demandComma = false
        this._column++
      } else if (demandComma) {
        throw new AsmException.SyntaxError_MissingComma(
          this._line,
          this._column,
        )
      } else if (this._line[this._column] === '~') {
        // print in hex
        this._column++
        let value: number
        try {
          value = this.EvaluateExpressionAsInt()
        } catch (e) {
          if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
            if (GlobalData.Instance.IsFirstPass()) {
              value = 0
            } else {
              throw e
            }
          }
        }
        this._currentAST.children.push(this._ASTValueStack[0])
      } else {
        this.EatWhitespace()
        const filelineKeyword = 'FILELINE$'
        const filelineKeywordLength = 9
        const callstackKeyword = 'CALLSTACK$'
        const callstackKeywordLength = 10
        if (
          this._line.substring(
            this._column,
            this._column + filelineKeywordLength,
          ) === filelineKeyword
        ) {
          this._column += filelineKeywordLength
          this._currentAST.children.push({
            type: ASTType.Value,
            value: filelineKeyword,
            startColumn: this._column,
            children: [],
          })
        } else if (
          this._line.substring(
            this._column,
            this._column + callstackKeywordLength,
          ) === callstackKeyword
        ) {
          this._column += callstackKeywordLength
          this._currentAST.children.push({
            type: ASTType.Value,
            value: callstackKeyword,
            startColumn: this._column,
            children: [],
          })
        } else {
          // print number in decimal or string
          let value: number | string
          try {
            value = this.EvaluateExpression()
            this._currentAST.children.push(this._ASTValueStack[0])
          } catch (e) {
            if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
              if (GlobalData.Instance.IsSecondPass()) {
                throw e
              }
            }
          }
        }
      }
    }
  }

  private HandleCpu(): void {
    const args = new ArgListParser(this)
    const newCpu = args.ParseInt().Range(0, 1).Value() as number
    args.CheckComplete()

    ObjectCode.Instance.SetCPU(newCpu)
  }

  private HandleOrg(): void {
    const args = new ArgListParser(this)
    const newPC = args.ParseInt().Range(0, 0xffff).Value() as number
    args.CheckComplete()

    ObjectCode.Instance.SetPC(newPC)
    SymbolTable.Instance.ChangeSymbol('P%', newPC)
  }

  private HandleInclude(): void {
    if (this._sourceCode.GetForLevel() > 0) {
      // disallow an include within a FOR loop
      throw new AsmException.SyntaxError_CantInclude(this._line, this._column)
    }
    const filename = this.EvaluateExpressionAsString().replace(/\\/g, '/')
    let fspath: string
    if (process.platform === 'win32') {
      fspath = URI.parse('file:///' + path.resolve(filename)).fsPath
    } else {
      fspath = URI.parse(path.resolve(filename)).fsPath
    }
    let includeFile: string
    if (process.platform === 'win32') {
      includeFile = URI.parse('file:///' + path.resolve(filename)).toString()
      // if (includeFile.endsWith('/')) {
      // 	includeFile = includeFile.substring(0, includeFile.length - 1);
      // }
    } else {
      includeFile = fspath
    }
    if (
      this._ASTValueStack[0].type === ASTType.Value &&
      this._ASTValueStack[0].value === '"' + filename + '"'
    ) {
      const startColumn = this._ASTValueStack[0].startColumn + 1
      const endColumn = startColumn + filename.length
      const link: DocumentLink = {
        range: {
          start: { line: this._lineno, character: startColumn },
          end: { line: this._lineno, character: endColumn },
        },
        target: includeFile,
      }
      this._sourceCode.AddDocumentLink(link)
    }

    const contents = FileHandler.Instance.GetDocumentText(fspath)
    const input = new SourceFile(
      contents,
      this._sourceCode,
      this._sourceCode.GetDiagnostics(),
      fspath,
      this._sourceCode.GetTrees(),
      this._sourceCode.GetDocumentLinks(),
    )
    input.Process()

    if (this.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
  }
  private HandleEqub(): void {
    const args = new ArgListParser(this)
    let value = args.ParseValue().AcceptUndef()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (typeof value.Value() === 'string') {
        // handle equs
        this.HandleEqus(value.Value() as string)
      } else if (typeof value.Value() === 'number') {
        // handle byte
        const number = value.Value() as integer
        if (number > 0xff) {
          throw new AsmException.SyntaxError_NumberTooBig(
            this._line,
            this._column,
          )
        }
        try {
          ObjectCode.Instance.PutByte(number & 0xff)
        } catch (e) {
          if (e instanceof AsmException.AssembleError) {
            e.SetString(this._line)
            e.SetColumn(this._column)
            throw e
          } else {
            throw e
          }
        }
      } else {
        // Unknown value type; this should never happen.
        // assert(false);
      }
      const arg = args.ParseValue().AcceptUndef()
      if (!arg.Found()) {
        break
      }
      value = arg
    }
    args.CheckComplete()
  }
  private HandleEqud(): void {
    const args = new ArgListParser(this)
    let value = args.ParseInt().AcceptUndef()
    // eslint-disable-next-line no-constant-condition
    if (typeof value.Value() === 'number') {
      const number = value.Value() as integer
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          ObjectCode.Instance.PutByte(number & 0xff)
          ObjectCode.Instance.PutByte((number & 0xff00) >> 8)
          ObjectCode.Instance.PutByte((number & 0xff0000) >> 16)
          ObjectCode.Instance.PutByte((number & 0xff000000) >> 24)
        } catch (e) {
          if (e instanceof AsmException.AssembleError) {
            e.SetString(this._line)
            e.SetColumn(this._column)
            throw e
          }
        }
        const arg = args.ParseInt().AcceptUndef()
        if (!arg.Found()) {
          break
        }
        value = arg
      }
    }
    args.CheckComplete()
  }
  private HandleEqus(equs: string): void {
    for (let i = 0; i < equs.length; i++) {
      const mappedchar = ObjectCode.Instance.GetMapping(equs.charCodeAt(i))
      try {
        // remap character from string as per character mapping table
        ObjectCode.Instance.PutByte(mappedchar)
      } catch (e) {
        if (e instanceof AsmException.AssembleError) {
          e.SetString(this._line)
          e.SetColumn(this._column)
          throw e
        }
      }
    }
  }
  private HandleEquw(): void {
    const args = new ArgListParser(this)
    let value = args.ParseInt().AcceptUndef().Maximum(0xffff).Value() as number
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        ObjectCode.Instance.PutByte(value & 0xff)
        ObjectCode.Instance.PutByte((value & 0xff00) >> 8)
      } catch (e) {
        if (e instanceof AsmException.AssembleError) {
          e.SetString(this._line)
          e.SetColumn(this._column)
          throw e
        }
      }
      const arg = args.ParseInt().AcceptUndef().Maximum(0xffff)
      if (!arg.Found()) {
        break
      }
      value = arg.Value() as number
    }
    args.CheckComplete()
  }
  private HandleAssert(): void {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // Take a copy of the column before evaluating the expression so
        // we can point correctly at the failed expression when throwing.
        const column = this._column
        const value = this.EvaluateExpressionAsInt()
        // We never throw for value being false on the first pass, simply
        // to ensure that if two assertions both fail, the one which
        // appears earliest in the source will be reported.
        if (!GlobalData.Instance.IsFirstPass() && !value) {
          while (
            this._column < this._line.length &&
            isspace(this._line[this._column])
          ) {
            this._column++
          }
          throw new AsmException.SyntaxError_AssertionFailed(this._line, column)
        }
      } catch (e) {
        if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
          if (!GlobalData.Instance.IsFirstPass()) {
            throw e
          }
        } else {
          throw e
        }
      }
      if (!this.AdvanceAndCheckEndOfStatement()) {
        break
      }
      if (
        this._column >= this._line.length ||
        this._line[this._column] != ','
      ) {
        throw new AsmException.SyntaxError_InvalidCharacter(
          this._line,
          this._column,
        )
      }
      this._column++
      if (!this.AdvanceAndCheckEndOfStatement()) {
        throw new AsmException.SyntaxError_EmptyExpression(
          this._line,
          this._column,
        )
      }
    }
  }
  private HandleSave(): void {
    // syntax is SAVE ["filename"], start, end [, exec [, reload] ]
    const args = new ArgListParser(this)
    const saveParam = args.ParseString()
    const start = args.ParseInt().Range(0, 0xffff).Value() as number
    const end = args.ParseInt().Range(0, 0x10000).Value() as number
    const exec = args
      .ParseInt()
      .AcceptUndef()
      .Default(start)
      .Range(0, 0xffffff)
      .Value() as number
    const reload = args
      .ParseInt()
      .Default(start)
      .Range(0, 0xffffff)
      .Value() as number
    args.CheckComplete()
    if (!saveParam.Found()) {
      if (GlobalData.Instance.GetOutputFile() != null) {
        saveParam.Default(GlobalData.Instance.GetOutputFile())
        if (GlobalData.Instance.IsSecondPass()) {
          if (GlobalData.Instance.GetNumAnonSaves() > 0) {
            throw new AsmException.SyntaxError_OnlyOneAnonSave(
              this._line,
              saveParam.Column(),
            )
          } else {
            GlobalData.Instance.IncNumAnonSaves()
          }
        }
      } else {
        throw new AsmException.SyntaxError_NoAnonSave(
          this._line,
          saveParam.Column(),
        )
      }
    }
  }
  private HandleFor(): void {
    // syntax is FOR variable, exp, exp [, exp]
    if (!this.AdvanceAndCheckEndOfStatement()) {
      // found nothing
      throw new AsmException.SyntaxError_EmptyExpression(
        this._line,
        this._column,
      )
    }
    // first look for the variable name
    if (!isalpha(this._line[this._column]) && this._line[this._column] != '_') {
      throw new AsmException.SyntaxError_InvalidSymbolName(
        this._line,
        this._column,
      )
    }
    // Symbol starts with a valid character
    const oldColumn = this._column
    // Change from c++ original: wait to add suffix after entered for loop
    const symbolName = this.GetSymbolName() // + this._sourceCode.GetSymbolNameSuffix();
    // Check variable has not yet been defined
    // Should not need this check since creating a new unique symbol including the new for stack pointer
    // if (SymbolTable.Instance.IsSymbolDefined(symbolName)) {
    // 	throw new AsmException.SyntaxError_LabelAlreadyDefined(this._line, oldColumn);
    // }
    const args = new ArgListParser(this, true)
    const start = args.ParseDouble().Value() as number
    const end = args.ParseDouble().Value() as number
    const step = args.ParseDouble().Default(1).Value() as number
    args.CheckComplete()
    if (step == 0.0) {
      throw new AsmException.SyntaxError_BadStep(this._line, this._column)
    }
    this._sourceCode.AddFor(
      symbolName,
      start,
      end,
      step,
      this._column + this._sourceCode.GetLineStartPointer(),
      this._line,
      oldColumn,
      this._lineno,
    )
  }
  private HandleNext(): void {
    const oldColumn = this._column
    if (this.AdvanceAndCheckEndOfStatement()) {
      // found nothing
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
    this._sourceCode.UpdateFor(this._line, oldColumn)
  }
  private HandleIf(): void {
    // Handles both IF and ELIF
    const condition = this.EvaluateExpressionAsInt() != 0
    this._sourceCode.SetCurrentIfCondition(condition)
    if (this._column < this._line.length && this._line[this._column] == ',') {
      // Unexpected comma (remembering that an expression can validly end with a comma)
      throw new AsmException.SyntaxError_UnexpectedComma(
        this._line,
        this._column,
      )
    }
  }
  private HandleDirective(): void {
    // directive that doesn't need extra handling; just check rest of line is empty
    if (this.AdvanceAndCheckEndOfStatement()) {
      // found nothing
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
  }
  private HandleAlign(): void {
    const oldColumn = this._column
    const val = this.EvaluateExpressionAsInt()
    if (val < 1 || (val & (val - 1)) != 0) {
      throw new AsmException.SyntaxError_BadAlignment(this._line, oldColumn)
    }
    while ((ObjectCode.Instance.GetPC() & (val - 1)) != 0) {
      try {
        ObjectCode.Instance.PutByte(0)
      } catch (e) {
        if (e instanceof AsmException.AssembleError) {
          e.SetString(this._line)
          e.SetColumn(this._column)
          throw e
        }
      }
    }
    if (this._column < this._line.length && this._line[this._column] == ',') {
      // Unexpected comma (remembering that an expression can validly end with a comma)
      throw new AsmException.SyntaxError_UnexpectedComma(
        this._line,
        this._column,
      )
    }
  }
  private HandleSkipTo(): void {
    const args = new ArgListParser(this)
    const addr = args.ParseInt().Range(0, 0x10000).Value() as number
    args.CheckComplete()

    if (addr < ObjectCode.Instance.GetPC()) {
      throw new AsmException.SyntaxError_BackwardsSkip(this._line, this._column)
    }
    while (ObjectCode.Instance.GetPC() < addr) {
      try {
        ObjectCode.Instance.PutByte(0)
      } catch (e) {
        if (e instanceof AsmException.AssembleError) {
          e.SetString(this._line)
          e.SetColumn(this._column)
          throw e
        }
      }
    }
  }
  private HandleSkip(): void {
    const oldColumn = this._column
    const val = this.EvaluateExpressionAsInt()
    if (val < 0) {
      throw new AsmException.SyntaxError_ImmNegative(this._line, oldColumn)
    }
    for (let i = 0; i < val; i++) {
      try {
        ObjectCode.Instance.PutByte(0)
      } catch (e) {
        if (e instanceof AsmException.AssembleError) {
          e.SetString(this._line)
          e.SetColumn(this._column)
          throw e
        }
      }
    }
    if (this._column < this._line.length && this._line[this._column] == ',') {
      // Unexpected comma (remembering that an expression can validly end with a comma)
      throw new AsmException.SyntaxError_UnexpectedComma(
        this._line,
        this._column,
      )
    }
  }
  private HandleGuard(): void {
    const args = new ArgListParser(this)
    const val = args.ParseInt().Range(0, 0xffff).Value() as number
    args.CheckComplete()

    ObjectCode.Instance.SetGuard(val)
  }
  private HandleClear(): void {
    const args = new ArgListParser(this)
    const start = args.ParseInt().Range(0, 0xffff).Value() as number
    const end = args.ParseInt().Range(0, 0x10000).Value() as number
    args.CheckComplete()

    ObjectCode.Instance.Clear(start, end)
  }
  private HandleIncBin(): void {
    const filename = this.EvaluateExpressionAsString()
    try {
      // ObjectCode.Instance.IncBin(filename); // Not needed for vscode extension unless want to check filesystem
    } catch (e) {
      if (e instanceof AsmException.AssembleError) {
        e.SetString(this._line)
        e.SetColumn(this._column)
        throw e
      }
    }
    if (this.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
  }
  private HandleOpenBrace(): void {
    this._sourceCode.OpenBrace(this._line, this._column)
  }
  private HandleCloseBrace(): void {
    this._sourceCode.CloseBrace(this._line, this._column)
  }
  private HandleMapChar(): void {
    // get parameters - either 2 or 3
    const args = new ArgListParser(this)
    const param1 = args.ParseInt().Range(0x20, 0x7e).Value() as number
    const param2 = args.ParseInt().Range(0, 0xff).Value() as number
    const param3 = args.ParseInt().Range(0, 0xff)
    args.CheckComplete()
    if (!param3.Found()) {
      // two parameters
      // do single character remapping
      ObjectCode.Instance.SetMapping(param1, param2)
    } else {
      // three parameters
      if (param2 < 0x20 || param2 > 0x7e || param2 < param1) {
        throw new AsmException.SyntaxError_OutOfRange(this._line, this._column)
      }
      // remap a block
      for (let i = param1; i <= param2; i++) {
        ObjectCode.Instance.SetMapping(
          i,
          (param3.Value() as number) + i - param1,
        )
      }
    }
  }
  private HandlePutFile(): void {
    this.HandlePutFileCommon(false)
  }
  private HandlePutText(): void {
    this.HandlePutFileCommon(true)
  }
  private HandlePutFileCommon(text: boolean): void {
    // Syntax:
    // PUTFILE/PUTTEXT <host filename>, [<beeb filename>,] <start addr> [,<exec addr>]
    const args = new ArgListParser(this)
    const hostFilename = args.ParseString().Value() as string
    if (
      text &&
      this._ASTValueStack[0].type === ASTType.Value &&
      this._ASTValueStack[0].value === '"' + hostFilename + '"'
    ) {
      const startColumn = this._ASTValueStack[0].startColumn + 1
      const endColumn = startColumn + hostFilename.length
      let filelink: string
      if (process.platform === 'win32') {
        filelink = URI.parse('file:///' + path.resolve(hostFilename)).toString()
        if (filelink.endsWith('/')) {
          filelink = filelink.substring(0, filelink.length - 1)
        }
      } else {
        filelink = URI.parse(path.resolve(hostFilename)).fsPath
      }
      const link: DocumentLink = {
        range: {
          start: { line: this._lineno, character: startColumn },
          end: { line: this._lineno, character: endColumn },
        },
        target: filelink,
      }
      this._sourceCode.AddDocumentLink(link)
    }
    const beebFilename = args.ParseString().Default(hostFilename)
    const start = args
      .ParseInt()
      .AcceptUndef()
      .Range(0, 0xffffff)
      .Value() as number
    const exec = args
      .ParseInt()
      .AcceptUndef()
      .Default(start)
      .Range(0, 0xffffff)
      .Value() as number
    args.CheckComplete()
  }
  private HandlePutBasic(): void {
    const hostFilename = this.EvaluateExpressionAsString()
    if (
      this._ASTValueStack[0].type === ASTType.Value &&
      this._ASTValueStack[0].value === '"' + hostFilename + '"'
    ) {
      const startColumn = this._ASTValueStack[0].startColumn + 1
      const endColumn = startColumn + hostFilename.length
      let filelink: string
      if (process.platform === 'win32') {
        filelink = URI.parse('file:///' + path.resolve(hostFilename)).toString()
        if (filelink.endsWith('/')) {
          filelink = filelink.substring(0, filelink.length - 1)
        }
      } else {
        filelink = URI.parse(path.resolve(hostFilename)).fsPath
      }
      const link: DocumentLink = {
        range: {
          start: { line: this._lineno, character: startColumn },
          end: { line: this._lineno, character: endColumn },
        },
        target: filelink,
      }
      this._sourceCode.AddDocumentLink(link)
    }
    let beebFilename = hostFilename
    if (this.AdvanceAndCheckEndOfStatement()) {
      // see if there's a second parameter
      if (this._line[this._column] != ',') {
        throw new AsmException.SyntaxError_MissingComma(
          this._line,
          this._column,
        )
      }
      this._column++
      beebFilename = this.EvaluateExpressionAsString()
    }
    // check this is now the end
    if (this.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
    // Could check if file exists but seems overkill for a syntax checker
  }
  private HandleMacro(): void {
    if (!this.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_EmptyExpression(
        this._line,
        this._column,
      )
    }
    let macroName = ''
    if (isalpha(this._line[this._column]) || this._line[this._column] == '_') {
      macroName = this.GetSymbolName()
      if (GlobalData.Instance.IsFirstPass()) {
        if (MacroTable.Instance.Exists(macroName)) {
          throw new AsmException.SyntaxError_DuplicateMacroName(
            this._line,
            this._column,
          )
        }
        this._sourceCode.GetCurrentMacro()!.SetName(macroName, this._column)
      }
    } else {
      throw new AsmException.SyntaxError_InvalidMacroName(
        this._line,
        this._column,
      )
    }
    let expectComma = false
    let hasParameters = false
    while (this.AdvanceAndCheckEndOfStatement()) {
      if (expectComma) {
        if (this._line[this._column] == ',') {
          this._column++
          expectComma = false
        } else {
          throw new AsmException.SyntaxError_MissingComma(
            this._line,
            this._column,
          )
        }
      } else if (
        isalpha(this._line[this._column]) ||
        this._line[this._column] == '_'
      ) {
        const param = this.GetSymbolName()
        if (GlobalData.Instance.IsFirstPass()) {
          this._sourceCode.GetCurrentMacro()!.AddParameter(param)
        }
        expectComma = true
        hasParameters = true
      } else {
        throw new AsmException.SyntaxError_InvalidSymbolName(
          this._line,
          this._column,
        )
      }
    }
    if (hasParameters && !expectComma) {
      throw new AsmException.SyntaxError_UnexpectedComma(
        this._line,
        this._column - 1,
      )
    }
    // If there is nothing else on the line following the MACRO command, put a newline at the
    // beginning of the macro definition, so any errors are reported on the correct line
    if (
      this._column == this._line.length &&
      GlobalData.Instance.IsFirstPass()
    ) {
      this._sourceCode.GetCurrentMacro()!.AddLine('\n')
    }
    // Set the IF condition to false - this is a cheaty way of ensuring that the macro body
    // is not assembled as it is parsed
    this._sourceCode.SetCurrentIfCondition(false)
  }
  private HandleEndMacro(): void {
    if (this.AdvanceAndCheckEndOfStatement()) {
      // found something
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
  }
  private HandleError(): void {
    const oldColumn = this._column
    if (!this.AdvanceAndCheckEndOfStatement()) {
      return // Allow empty error statements (seen in some examples, not strictly valid but compile will stop with an error anyway)
    }
    const errorMsg = this.EvaluateExpressionAsString()
    // This is a slight change in behaviour.  It used to check the statement
    // was well-formed after the error was thrown.
    if (this.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
    // throw error (in original c++, not suitable for vscode extension as we want to continue parsing)
    // throw new AsmException.UserError(this._line, oldColumn, errorMsg);
  }
  private HandleCopyBlock(): void {
    const args = new ArgListParser(this)
    const start = args.ParseInt().Range(0, 0xffff).Value() as number
    const end = args.ParseInt().Range(0, 0xffff).Value() as number
    const dest = args.ParseInt().Range(0, 0xffff).Value() as number
    args.CheckComplete()
    try {
      ObjectCode.Instance.CopyBlock(
        start,
        end,
        dest,
        GlobalData.Instance.IsFirstPass(),
      )
    } catch (e) {
      if (e instanceof AsmException.AssembleError) {
        e.SetString(this._line)
        e.SetColumn(this._column)
        throw e
      }
    }
  }
  private HandleRandomize(): void {
    let value: integer
    try {
      value = this.EvaluateExpressionAsInt()
    } catch (e) {
      if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
        if (GlobalData.Instance.IsFirstPass()) {
          value = 0
        } else {
          throw e
        }
      }
    }
    // beebasm_srand( value ); // No need to actually set in vscode extension
    if (this._column < this._line.length && this._line[this._column] == ',') {
      // Unexpected comma (remembering that an expression can validly end with a comma)
      throw new AsmException.SyntaxError_UnexpectedComma(
        this._line,
        this._column,
      )
    }
  }
  private HandleAsm(): void {
    // look for assembly language string
    const assembly = this.EvaluateExpressionAsString()
    // check this is now the end
    if (this.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._line,
        this._column,
      )
    }
    const parser = new LineParser(this._sourceCode, assembly, this._lineno)
    // Parse the mnemonic, don't require a non-alpha after it.
    const instruction = parser.GetInstructionAndAdvanceColumn(false)
    if (instruction < 0) {
      throw new AsmException.SyntaxError_MissingAssemblyInstruction(
        parser._line,
        parser._column,
      )
    }
  }

  // Unary operator stubs
  private EvalNegate(): void {
    this._valueStack[this._valueStackPtr - 1] = -this.StackTopNumber()
  }
  private EvalPosate(): void {
    if (this._valueStackPtr < 1) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    // does absolutely nothing
  }
  private EvalHi(): void {
    const value = (this.StackTopInt() & 0xffff) >> 8
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalLo(): void {
    const value = this.StackTopInt() & 0xff
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalSin(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.sin(this.StackTopNumber())
  }
  private EvalCos(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.cos(this.StackTopNumber())
  }
  private EvalTan(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.tan(this.StackTopNumber())
  }
  private EvalArcSin(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.asin(this.StackTopNumber())
    if (isNaN(this._valueStack[this._valueStackPtr - 1] as number)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
  }
  private EvalArcCos(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.acos(this.StackTopNumber())
    if (isNaN(this._valueStack[this._valueStackPtr - 1] as number)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
  }
  private EvalArcTan(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.atan(this.StackTopNumber())
    if (isNaN(this._valueStack[this._valueStackPtr - 1] as number)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
  }
  private EvalSqrt(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.sqrt(this.StackTopNumber())
    if (isNaN(this._valueStack[this._valueStackPtr - 1] as number)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
  }
  private EvalDegToRad(): void {
    this._valueStack[this._valueStackPtr - 1] =
      this.StackTopNumber() * (Math.PI / 180.0)
  }
  private EvalRadToDeg(): void {
    this._valueStack[this._valueStackPtr - 1] =
      this.StackTopNumber() * (180.0 / Math.PI)
  }
  private EvalInt(): void {
    this._valueStack[this._valueStackPtr - 1] = this.StackTopInt()
  }
  private EvalAbs(): void {
    this._valueStack[this._valueStackPtr - 1] = Math.abs(this.StackTopNumber())
  }
  private EvalSgn(): void {
    const value = this.StackTopNumber()
    if (value < 0) {
      this._valueStack[this._valueStackPtr - 1] = -1
    } else if (value > 0) {
      this._valueStack[this._valueStackPtr - 1] = 1
    } else {
      this._valueStack[this._valueStackPtr - 1] = 0
    }
  }
  private EvalRnd(): void {
    // Does not need to be random in vscode extension but what to put?
    const val = this.StackTopNumber()
    let result = 0.0
    if (val < 1.0) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    } else if (val == 1.0) {
      result = Math.random()
    } else {
      result = Math.floor(Math.random() * val)
    }
    this._valueStack[this._valueStackPtr - 1] = result
  }
  private EvalNot(): void {
    const value = ~this.StackTopInt()
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalLog(): void {
    const value = Math.log10(this.StackTopNumber())
    if (isNaN(value)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalLn(): void {
    const value = Math.log(this.StackTopNumber())
    if (isNaN(value)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalExp(): void {
    const value = Math.exp(this.StackTopNumber())
    if (isNaN(value)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalTime(): void {
    this._valueStack[this._valueStackPtr - 1] = this.FormatAssemblyTime(
      this.StackTopString(),
    )
  }
  private EvalStr(): void {
    this._valueStack[this._valueStackPtr - 1] = this.StackTopNumber().toString()
  }
  private EvalStrHex(): void {
    const value = this.StackTopInt()
    const result = value.toString(16).toUpperCase()
    this._valueStack[this._valueStackPtr - 1] = result
  }
  private EvalVal(): void {
    const str = this.StackTopString()
    const value = parseFloat(str)
    this._valueStack[this._valueStackPtr - 1] = value
  }
  private EvalEval(): void {
    const expr = this.StackTopString()
    const parser = new LineParser(this._sourceCode, expr, this._lineno)
    const result = parser.EvaluateExpression()
    this._valueStack[this._valueStackPtr - 1] = result
  }
  private EvalLen(): void {
    const str = this.StackTopString()
    this._valueStack[this._valueStackPtr - 1] = str.length
  }
  private EvalChr(): void {
    const ascii = this.StackTopInt()
    if (ascii < 0 || ascii > 255) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column,
      )
    }
    const buffer = String.fromCharCode(ascii)
    this._valueStack[this._valueStackPtr - 1] = buffer
  }
  private EvalAsc(): void {
    const str = this.StackTopString()
    if (str.length == 0) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = str.charCodeAt(0)
  }
  private EvalMid(): void {
    if (this._valueStackPtr < 3) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value1 = this._valueStack[this._valueStackPtr - 3]
    const value2 = this._valueStack[this._valueStackPtr - 2]
    const value3 = this._valueStack[this._valueStackPtr - 1]
    if (
      typeof value1 !== 'string' ||
      typeof value2 !== 'number' ||
      typeof value3 !== 'number'
    ) {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    this._valueStackPtr -= 2
    const text = value1
    const index = Math.floor(value2) - 1
    const length = Math.floor(value3)
    if (index < 0 || index > text.length || length < 0) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = text.substring(
      index,
      index + length,
    )
  }
  private EvalLeft(): void {
    if (this._valueStackPtr < 2) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value1 = this._valueStack[this._valueStackPtr - 2]
    const value2 = this._valueStack[this._valueStackPtr - 1]
    if (typeof value1 !== 'string' || typeof value2 !== 'number') {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    this._valueStackPtr -= 1
    const text = value1
    const count = Math.floor(value2)
    if (count < 0 || count > text.length) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = text.substring(0, count)
  }
  private EvalRight(): void {
    if (this._valueStackPtr < 2) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value1 = this._valueStack[this._valueStackPtr - 2]
    const value2 = this._valueStack[this._valueStackPtr - 1]
    if (typeof value1 !== 'string' || typeof value2 !== 'number') {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    this._valueStackPtr -= 1
    const text = value1
    const count = Math.floor(value2)
    if (count < 0 || count > text.length) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = text.substring(
      text.length - count,
    )
  }
  private EvalString(): void {
    if (this._valueStackPtr < 2) {
      throw new AsmException.SyntaxError_MissingValue(this._line, this._column)
    }
    const value1 = this._valueStack[this._valueStackPtr - 2]
    const value2 = this._valueStack[this._valueStackPtr - 1]
    if (typeof value1 !== 'number' || typeof value2 !== 'string') {
      throw new AsmException.SyntaxError_TypeMismatch(this._line, this._column)
    }
    this._valueStackPtr -= 1
    const count = Math.floor(value1)
    const text = value2
    if (
      count < 0 ||
      count >= 0x10000 ||
      text.length >= 0x10000 ||
      count * text.length >= 0x10000
    ) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column,
      )
    }
    this._valueStack[this._valueStackPtr - 1] = text.repeat(count)
  }
  private EvalUpper(): void {
    const value = this.StackTopString()
    this._valueStack[this._valueStackPtr - 1] = value.toUpperCase()
  }
  private EvalLower(): void {
    const value = this.StackTopString()
    this._valueStack[this._valueStackPtr - 1] = value.toLowerCase()
  }
  private EvalPower(): void {
    const values = this.StackTopTwoValues()
    const result = Math.pow(values[0] as number, values[1] as number)
    this._valueStack[this._valueStackPtr - 2] = result
    this._valueStackPtr--
    if (isNaN(result)) {
      throw new AsmException.SyntaxError_IllegalOperation(
        this._line,
        this._column - 1,
      )
    }
  }
  private EvalMultiply(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] * values[1]
    this._valueStackPtr--
  }
  private EvalDivide(): void {
    const values = this.StackTopTwoNumbers()
    if (values[1] == 0) {
      throw new AsmException.SyntaxError_DivisionByZero(
        this._line,
        this._column - 1,
      )
    }
    this._valueStack[this._valueStackPtr - 2] = Math.floor(
      values[0] / values[1],
    )
    this._valueStackPtr--
  }
  private EvalDiv(): void {
    const values = this.StackTopTwoNumbers()
    if (Math.floor(values[1]) == 0) {
      throw new AsmException.SyntaxError_DivisionByZero(
        this._line,
        this._column - 1,
      )
    }
    this._valueStack[this._valueStackPtr - 2] =
      Math.floor(values[0]) / Math.floor(values[1])
    this._valueStackPtr--
  }
  private EvalMod(): void {
    const values = this.StackTopTwoNumbers()
    if (Math.floor(values[1]) == 0) {
      throw new AsmException.SyntaxError_DivisionByZero(
        this._line,
        this._column - 1,
      )
    }
    this._valueStack[this._valueStackPtr - 2] =
      Math.floor(values[0]) % Math.floor(values[1])
    this._valueStackPtr--
  }
  private ArithmeticShiftRight(value: number, shift: number): number {
    let shifted: number = value >>> shift
    if (value < 0) {
      const bitcount = 8 * 4
      const mask =
        Math.pow(2, bitcount) - 1 - (Math.pow(2, bitcount - shift) - 1)
      shifted |= mask
    }
    return shifted
  }
  private EvalShiftLeft(): void {
    const values = this.StackTopTwoNumbers()
    const val = Math.floor(values[0])
    const shift = Math.floor(values[1])
    let result: number
    if (shift > 31 || shift < -31) {
      result = 0
    } else if (shift > 0) {
      result = val << shift
    } else if (shift == 0) {
      result = val
    } else {
      result = this.ArithmeticShiftRight(val, -shift)
    }
    this._valueStack[this._valueStackPtr - 2] = result
    this._valueStackPtr--
  }
  private EvalShiftRight(): void {
    const values = this.StackTopTwoNumbers()
    const val = Math.floor(values[0])
    const shift = Math.floor(values[1])
    let result: number
    if (shift > 31 || shift < -31) {
      result = 0
    } else if (shift > 0) {
      result = this.ArithmeticShiftRight(val, shift)
    } else if (shift == 0) {
      result = val
    } else {
      result = val << -shift
    }
    this._valueStack[this._valueStackPtr - 2] = result
    this._valueStackPtr--
  }
  private EvalAdd(): void {
    const values = this.StackTopTwoValues()
    if (typeof values[0] === 'number') {
      this._valueStack[this._valueStackPtr - 2] =
        (values[0] as number) + (values[1] as number)
    } else {
      this._valueStack[this._valueStackPtr - 2] = values[0] + values[1]
    }
    this._valueStackPtr--
  }
  private EvalSubtract(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] - values[1]
    this._valueStackPtr--
  }
  private EvalEqual(): void {
    const values = this.StackTopTwoValues()
    this._valueStack[this._valueStackPtr - 2] = values[0] == values[1] ? -1 : 0
    this._valueStackPtr--
  }
  private EvalNotEqual(): void {
    const values = this.StackTopTwoValues()
    this._valueStack[this._valueStackPtr - 2] = values[0] != values[1] ? -1 : 0
    this._valueStackPtr--
  }
  private EvalLessThanOrEqual(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] <= values[1] ? -1 : 0
    this._valueStackPtr--
  }
  private EvalMoreThanOrEqual(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] >= values[1] ? -1 : 0
    this._valueStackPtr--
  }
  private EvalLessThan(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] < values[1] ? -1 : 0
    this._valueStackPtr--
  }
  private EvalMoreThan(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] > values[1] ? -1 : 0
    this._valueStackPtr--
  }
  private EvalAnd(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] & values[1]
    this._valueStackPtr--
  }
  private EvalOr(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] | values[1]
    this._valueStackPtr--
  }
  private EvalEor(): void {
    const values = this.StackTopTwoNumbers()
    this._valueStack[this._valueStackPtr - 2] = values[0] ^ values[1]
    this._valueStackPtr--
  }

  public GetTree(): AST {
    return this._tree
  }

  public AddASTNode(node: AST): void {
    this._currentAST.children.push(node)
  }

  public ReadASTValue(): AST {
    return this._ASTValueStack[0]
  }
}

enum State {
  // A value of type T was successfully parsed
  StateFound,
  // A value of the wrong type was available
  StateTypeMismatch,
  // A symbol is undefined
  StateUndefined,
  // No value was available (i.e. the end of the parameters)
  StateMissing,
}

// TODO - better to make explicitly typed args (string, double, int, number | string) to align with c++?
class Argument {
  private _line: string
  private _column: integer
  private _state: State
  private _value: number | string | undefined
  constructor(
    line: string,
    column: integer,
    state?: State,
    value?: number | string,
  ) {
    this._line = line
    this._column = column
    if (state === undefined) {
      this._state = State.StateFound
    } else {
      this._state = state
    }
    if (value !== undefined) {
      this._value = value
    }
  }
  Found(): boolean {
    return this._state == State.StateFound
  }
  Column(): integer {
    return this._column
  }
  Value(): number | string | undefined {
    return this._value
  }
  Range(mn: number, mx: number): Argument {
    if (this.Found()) {
      if (typeof this._value === 'number') {
        if (this._value < mn || this._value > mx) {
          throw new AsmException.SyntaxError_OutOfRange(
            this._line,
            this._column,
          )
        }
      }
    }
    return this
  }
  Maximum(mx: number): Argument {
    if (this.Found()) {
      if (typeof this._value === 'number') {
        if (this._value > mx) {
          throw new AsmException.SyntaxError_NumberTooBig(
            this._line,
            this._column,
          )
        }
      }
    }
    return this
  }
  // Set a default value for optional parameters.
  Default(value: number | string): Argument {
    if (!this.Found()) {
      if (typeof this._value === 'string') {
        this._value = value
        this._state = State.StateFound
      } else {
        if (this._state == State.StateUndefined) {
          throw new AsmException.SyntaxError_SymbolNotDefined(
            this._line,
            this._column,
          )
        }
        this._value = value
        this._state = State.StateFound
      }
    }
    return this
  }
  // Permit this parameter to be an undefined symbol unless string type.
  AcceptUndef(): Argument {
    if (typeof this._value === 'string') {
      if (this._state == State.StateUndefined) {
        throw new AsmException.SyntaxError_SymbolNotDefined(
          this._line,
          this._column,
        )
      }
    } else {
      if (this._state == State.StateUndefined) {
        this._state = State.StateFound
        this._value = 0
      }
    }
    return this
  }
}
class ArgListParser {
  private _first
  private _pending
  private _lineParser: LineParser
  private _pendingUndefined = false
  private _pendingValue: number | string | undefined
  private _paramColumn = 0
  constructor(lineParser: LineParser, comma_first = false) {
    this._first = !comma_first
    this._pending = false
    this._lineParser = lineParser
  }

  ParseInt(): Argument {
    return this.ParseNumber((arg: number) => Math.trunc(arg))
  }

  ParseDouble(): Argument {
    return this.ParseNumber((arg: number) => arg)
  }

  ParseString(): Argument {
    if (!this.ReadPending()) {
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateMissing,
      )
    }
    if (this._pendingUndefined) {
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateUndefined,
      )
    }
    if (typeof this._pendingValue !== 'string') {
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateTypeMismatch,
      )
    }
    this._pending = false
    return new Argument(
      this._lineParser._line,
      this._paramColumn,
      State.StateFound,
      this._pendingValue,
    )
  }

  ParseValue(): Argument {
    if (!this.ReadPending()) {
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateMissing,
      )
    }
    if (this._pendingUndefined) {
      this._pending = false
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateUndefined,
      )
    }
    this._pending = false
    return new Argument(
      this._lineParser._line,
      this._paramColumn,
      State.StateFound,
      this._pendingValue,
    )
  }

  ParseNumber(convert: (arg: number) => number): Argument {
    if (!this.ReadPending()) {
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateMissing,
      )
    }
    if (this._pendingUndefined) {
      this._pending = false
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateUndefined,
      )
    }
    if (typeof this._pendingValue !== 'number') {
      return new Argument(
        this._lineParser._line,
        this._paramColumn,
        State.StateTypeMismatch,
      )
    }
    this._pending = false
    return new Argument(
      this._lineParser._line,
      this._paramColumn,
      State.StateFound,
      convert(this._pendingValue),
    )
  }

  public CheckComplete(): void {
    if (this._pending) {
      throw new AsmException.SyntaxError_TypeMismatch(
        this._lineParser._line,
        this._lineParser._column,
      )
    }
    if (this._lineParser.AdvanceAndCheckEndOfStatement()) {
      throw new AsmException.SyntaxError_InvalidCharacter(
        this._lineParser._line,
        this._lineParser._column,
      )
    }
  }

  // Return true if an argument is available
  private ReadPending(): boolean {
    if (!this._pending) {
      const found = this.MoveNext()
      if (found) {
        try {
          this._pendingUndefined = false
          this._pendingValue = this._lineParser.EvaluateExpression()
        } catch (e) {
          if (e instanceof AsmException.SyntaxError_SymbolNotDefined) {
            if (!GlobalData.Instance.IsFirstPass()) {
              throw e
            }
            this._pendingUndefined = true
            this._pendingValue = 0
          } else {
            throw e
          }
        }
        this._pending = true
        if (!this._pendingUndefined) {
          this._lineParser.AddASTNode(this._lineParser.ReadASTValue())
        }
      }
    }
    return this._pending
  }

  // Return true if there's something to parse
  private MoveNext(): boolean {
    if (this._first) {
      this._first = false
      return this._lineParser.AdvanceAndCheckEndOfStatement()
    } else {
      if (this._lineParser.AdvanceAndCheckEndOfStatement()) {
        // If there's anything of interest it must be a comma
        if (
          this._lineParser._column >= this._lineParser._line.length ||
          this._lineParser._line[this._lineParser._column] != ','
        ) {
          // did not find a comma
          throw new AsmException.SyntaxError_InvalidCharacter(
            this._lineParser._line,
            this._lineParser._column,
          )
        }
        this._lineParser._column++
        this._lineParser.EatWhitespace()
        return true
      }
      return false
    }
  }
}
