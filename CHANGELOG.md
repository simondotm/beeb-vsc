# Release notes

See [Releases on Github](https://github.com/simondotm/beeb-vsc/releases) for full release history.

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
