# Release notes

See [Releases on Github](https://github.com/simondotm/beeb-vsc/releases) for full release history.

### 0.3.5
 - Fix evaluation of division in expressions to not floor the result
 - Avoid infinite loop possibility with FOR loops inside macros

### 0.3.4
 - Bump versions for tar-fs, undici, serialize-javascript, mocha and esbuild [@dependabot]
 - Add project identifier `beebvsc` to commands

### 0.3.3
 - Debugger now stops on first breakpoint encountered rather than second
 - Fix for labels outside of FOR loops getting affected by loop counter
 - Add inlay hints for showing cycle counts next to assembly instructions (enable via setting `beebvsc.enableInlayHints`)

### 0.3.2
 - Create new target command now finds all matching file extensions regardless of case e.g. main.ASM

### 0.3.1
 - Add memory view for debugger (under Variables-->System-->Memory, click icon to view)
 - Allow watches to be set based on addresses e.g. `($2000)` or `$($80).w`
 - Format watch as string of fixed length e.g. `message.s10` for string of length 10 at label 'message'
 - Bump webpack version [@dependabot]

### 0.3.0
 - Add ability to output a source map file
 - *Experimental* debug functionality via integrated JSBeeb emulator
 - Bump braces version [@dependabot]

### 0.2.4
- Minor quality of life fixes
  - Opcodes and register names included in autocomplete
  - Don't show signature helper when in comments
  - Label names take priority over keyworks for syntax highlighting
  - Limit reporting 'second pass consistency' error to first point where it occurs

### 0.2.3
- Add functionality around macros (references, symbol highlighting etc.)
- Change default paths in settings.json to be relative so projects are portable
- If settings.json doesn't exist, will try to create from tasks.json information
- Fix for rename failing after performing 'find all references' on the symbol to be renamed

### 0.2.2
- Fix for error parsing issues when settings.json is not set up

### 0.2.1
- Hotfix for dependency issue preventing extension from activating

### 0.2.0
- Added support for integrated JSBeeb emulator within VSCode editor
- Improved source code parsing
- Autodetect changes to `settings.json`
- Added usage telemetry (opt-in based on user's VSCode telemetry settings)

### 0.1.2
- Improve completions for symbols and commands

### 0.1.1
- Substantial internal refactoring and minor bug fixes
- Added support for 65C02 opcodes
- Fix for target adding and switching

### 0.1.0
- Migrated extension to Typescript
- Move to Language Server Protocol
- Support for source code hover information (on opcodes, symbols, labels, functions and commands)
- Support for auto completions (BeebAsm functions and commands + symbols and labels within the workspace)
- Support for diagnostics to highlight BeebAsm compilation errors in code editor
- Support for reference finding (goto, peek, find all, rename refactoring)
- Improved syntax parsing for BeebAsm keywords from 1.08 to 1.10

### 0.0.6
- Added full build environment support via JS script to extension
- First version published to Visual Studio Code Marketplace

### 0.0.5
- Test version

### 0.0.4
- Test update

### 0.0.3
- Initial version
