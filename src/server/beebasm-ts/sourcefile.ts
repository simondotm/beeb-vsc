/*************************************************************************************************/
/**
  Derived from sourcefile.cpp/h

  Assembles a file


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

import { AST } from '../ast'
import { FileHandler } from '../filehandler'
import { SourceMap } from '../../types/shared/debugsource'
import { SourceCode } from './sourcecode'
import { Diagnostic, DocumentLink, URI } from 'vscode-languageserver'

export class SourceFile extends SourceCode {
  constructor(
    contents: string,
    parent: SourceCode | null,
    diagnostics: Map<string, Diagnostic[]>,
    uri: URI,
    trees: Map<string, AST[]>,
    links: Map<string, DocumentLink[]>,
    callPoint: SourceMap | null,
  ) {
    super(contents, 0, parent, diagnostics, uri, trees, links, callPoint)
    // set self-reference in source to parent map if this is a root file
    if (parent === null) {
      FileHandler.Instance.SetTargetFileName(uri, uri)
    } else {
      FileHandler.Instance.SetTargetFileName(uri, parent.GetURI())
    }
  }

  GetLine(lineNumber: number): string {
    return super.GetLine(lineNumber)
  }
}
