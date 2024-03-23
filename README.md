# Beeb VSC
A [Visual Studio Code](https://code.visualstudio.com/) Extension to support code development for the Acorn BBC Micro/Master range of 6502 based micro computers from the 1980's.

Visual Studio Code is free and really good for general retro/6502 development, so this extension was created to enhance the experience by providing syntax colouring for 6502 opcodes, labels, and BBC BASIC commands & functions supported by [BeebAsm](https://github.com/stardot/beebasm) as well as various types of VS Code functionality.

See the [CHANGELOG](./CHANGELOG.md) for full release history.

# Features

## Syntax Highlighting:
- All **6502 op-codes** (no 65C02 op codes yet)
- **.label** style labels
- **$** or **&** style hex constants
- All **BBC BASIC** style keywords (such as `TAN`, `RND`, `MOD`, `DIV` etc.)
- All **BeebAsm** directives (such as `ORG`, `GUARD`, `SKIP` etc.)

## Hover Information:
- BeebAsm functions (`RND`, `CHR$`, `LO` etc.)
- BeebAsm directives (`SAVE`, `EQUB`, `ORG` etc.)
- Op-code information (description, bytecode, cycles etc.)
- Symbols and labels show the line of code where they are declared

## References:
The various types of reference navigation options available within VS Code via the context menu (right-click on a symbol or label).
- Go to definition
- Find all references
- Peek definition/references
- Links added to files referenced via `INCLUDE`, `PUTBASIC` or `PUTTEXT`
- The rename refactoring functionality is also included

## Diagnostics:
The extension parses your code to try and identify the errors that would be reported by BeebAsm when compiling your code. Lines with issues will be underlined and reported in the Problems tab of VS Code. Dozens of issues are detected including:
- BeebAsm function and directive syntax errors
- Assembly errors (e.g. branch out of bounds, invalid addressing modes)

## Completions:
Provides a list of potential matches as you start to type.
- BeebAsm functions
- BeebAsm directives
- Symbols and labels

## Supported Filetypes:
- `.6502`
- `.asm`
- `.s`

## Build tools
- Assemble & test 6502 projects all within Visual Studio Code
- Assembly errors are parsed and sent to VSC's built-in error navigation view
- Uses Visual Studio Code tasks for building & testing
- Easily create new build targets (supports multiple targets within a project folder)
- Easily select 'default' build targets  
- Run build targets in the emulator of your choice

## Integrated BBC Micro Emulator

- [Preview your projects](./docs/emulator.md) directly within VSCode using an integrated [JSBeeb](https://github.com/mattgodbolt/jsbeeb) emulator

![Screenshot](./docs/images/emulator-view.png?raw=true)


# Quick Setup

## 1. Install the extension
Press CTRL+Shift+X in VS Code, search for 'beeb vsc' or 'beebasm', click install.

## 2. Install Assembler and Emulator
By default, BeebVSC configures `BeebAsm.exe` as the default assembler, and `BeebEm.exe` as the default emulator, and assumes that these executables are can be located on the system path. If not, simply add paths to them in your global Windows environment variables.

## 3. Load your project
Open your project folder in VSC. Syntax colouring will automatically activate when `.6502`, `.asm`, or `.s` files are opened in the editor.

![Screenshot](./docs/images/example.png?raw=true)

## 4. Create a new build target
Press `F10` and the extension will provide a drop down list of compatible source files it has found in the current workspace. 

![Screenshot](./docs/images/createtarget.png?raw=true)

Select the one that you wish to assemble with `BeebAsm`, and a new build target will be created in your workspace.

![Screenshot](./docs/images/targetcreated.png?raw=true)

A `tasks.json` file will be created in a `.vscode` folder in your workspace containing the required tasks to build or run your targets. A `settings.json` file will also be created in the same location and is used for identifying the target source file(s) so we can parse the files in a suitable order even when viewing a different source file.

![Screenshot](./docs/images/tasksjson.png?raw=true)


## 5. Build the target
Press `F7` or `Ctrl+Shift+B` and Visual Studio Code will build(assemble) the source file you selected and output a disk image `<sourcefile>.ssd`.

Any errors output by the assembler will be captured in Visual Studio Code's `Problems` view.

## 6. Run the target
Press `F9` or `Ctrl+Shift+T` and Visual Studio Code will run your disk image with the currently configured emulator (`BeebEm` by default)

**That's it! Have fun!**

# Advanced Usage

## Changing Assembler and/or Emulator configuration
If you wish to change your Assembler or Emulator configuration, go to `File->Preferences->User Settings` in Visual Studio Code, the editor will present current user preferences. Scroll to the bottom of the configuration until you see the BeebVSC settings. Copy the settings `"beebvsc.assembler"` and `"beebvsc.emulator"` across to your user settings and modify accordingly. Note that although full paths to executables can be included here, we do not recommend this since they are not portable if your project source is shared.

![Screenshot](./docs/images/usersettings.PNG?raw=true)

## Managing multiple build targets
You can run the add build target command multiple times to add additional source files to the list of build targets in the `tasks.json` file.

## Switching between build targets
It is possible to switch between build targets as follows:

Press `F6` and the extension will provide a drop down list of build targets currently in the `tasks.json` file. 

![Screenshot](./docs/images/selecttarget.png?raw=true)

The selection you make will become the new default 'build' and 'test' target, which can then be built as normal by pressing `F7` or `Ctrl+Shift+B`, or similarly, pressing `F9` or `Ctrl+Shift+T` to run in the emulator.

**NOTE:** It is not possible to add duplicate targets, also note that only one target can be built at once.

## Listing commands
Press `Ctrl+Shift+P` to open the command palette. In here you will see the BeebVSC commands listed for reference/convenience.

![Screenshot](./docs/images/commands.png?raw=true)

## Running specific tasks
BeebVSC takes advantage of standard Visual Studio Code 'tasks', which are just a list of named shell commands stored in the `.vscode/tasks.json` file. Each task is 'runnable' in its own right, so another useful shortcut is `Ctrl+Shift+R` to list all of the current tasks, which you can then manually select.

![Screenshot](./docs/images/runtasks.png?raw=true)

## Adding custom tasks
The BeebVSC extension is careful to preserve the contents of the `tasks.json` file. Therefore once targets(tasks) have been added, is very easy to manually configure or override them by simply making modifications to the `tasks.json` file directly:
- You can rename targets if you wish, there is no logic dependent on this
- You can modify commandline arguments if you wish
- You can your own additional commandline tasks if you like (eg. for compiling other data etc.)
- You can manually remove tasks if you wish


The only property that is managed by the extension is `Group -> Kind`, so this is subject to modification.
Note also that the commandline argument for the test task is managed by the extension, and updates whenever a new build target is selected.

## Directly managing target source files
If you don't want to use BeebVSC's functionality to add build targets, some functionality will be limited because the extension will not know what order INCLUDE files are processed. In this case, it is necessary to add the target file(s) to the `settings.json` file. For example, if the targets `build.asm` and `loader.asm` are run through BeebAsm then the settings file would look like: 
```json
{
    "beebvsc": {
        "sourceFile": [
            "/Users/Games/Test/build.asm",
            "/Users/Games/Test/loader.asm"
        ],
        "targetName": "main.ssd"
    }
}
```
The easiest way to set this up is adding the build targets in a normal way and they removing the `tasks.json` entries if those are not wanted.

## Command Line format
Due to constraints in the way that Visual Studio Code handles tasks, BeebVSC tasks must be executed as single arguments to a shell such as `"cmd.exe"`.

## Linux/Mac support
The installation is for Windows by default, but its quite feasible to get it working for Linux and MacOS. Primarily this is done by changing the settings for `"beebvsc.assembler"` and `"beebvsc.emulator"`.

**Possible further features to add**
- Support for BBC BASIC text files (can be compiled to SSD via BeebAsm) and full syntax colouring
- Support 'remove target' feature
- Support different 6502 assemblers
- Support full 6502 debugging via a VSC debug-adapter (way beyond my pay grade, but maybe someone out there fancies a challenge! ;))



## Contributors & Kudos

Many thanks to the following people who have contributed directly & indirectly to this project:

* **[Tom Helm](https://github.com/tommy9)**
* **[Rich Talbot-Watkins](https://github.com/richtw1)**
* **[Matt Godbolt](https://github.com/mattgodbolt)**

More information [here](docs/extension-development.md) about developing the extension.

## Acorn Community

### Development tools
- [Rich Talbot-Watkin's rather brilliant BeebAsm project](https://github.com/stardot/beebasm/blob/master/README.md)

### Emulators
- [BeebEm Emulator](http://www.mkw.me.uk/beebem/index.html)
- [BeebEm Emulator for Windows](https://github.com/stardot/beebem-windows)
- [B2 emulator](https://github.com/tom-seddon/b2)
- [B-Em emulator](https://github.com/stardot/b-em)
- [JSBeeb Emulator](https://bbc.godbolt.org/)

### BBC Micro/6502 Resources:
- [Stardot Acorn/BBC Micro forums](http://stardot.org.uk/forums/)
- [Stardot Github](https://github.com/stardot)
- [bbcmicro.co.uk](https://bbcmicro.co.uk/)
- [Owlet BBC Basic Editor](https://bbcmic.ro/)
- [BBC Micro Bot](https://www.bbcmicrobot.com/)



