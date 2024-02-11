# Beeb VSC
[Visual Studio Code](https://code.visualstudio.com/) Extension to support code development primarily for BBC Micro, but it might be useful for other 6502 based machines.

Visual Studio Code is free and really good for general retro/6502 development, so this extension was created to enhance the experience by providing syntax colouring for 6502 opcodes, labels, and BBC BASIC commands & functions supported by [BeebAsm](https://github.com/stardot/beebasm) as well as various types of VS Code functionality.


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
- .6502
- .asm
- .s

## Build tools
- Assemble & test 6502 projects all within Visual Studio Code
- Assembly errors are parsed and sent to VSC's built-in error navigation view
- Uses Visual Studio Code tasks for building & testing
- Easily create new build targets (supports multiple targets within a project folder)
- Easily select 'default' build targets  
- Run build targets in the emulator of your choice

# Quick Setup

## 1. Install the extension
Press CTRL+Shift+X in VS Code, search for 'beeb vsc' or 'beebasm', click install.

## 2. Install Assembler and Emulator
By default, BeebVSC configures `BeebAsm.exe` as the default assembler, and `BeebEm.exe` as the default emulator, and assumes that these executables are can be located on the system path. If not, simply add paths to them in your global Windows environment variables.

## 3. Load your project
Open your project folder in VSC. Syntax colouring will automatically activate when `.6502`, `.asm`, or `.s` files are opened in the editor.

![Screenshot](./images/example.png?raw=true)

## 4. Create a new build target
Press `F10` and the extension will provide a drop down list of compatible source files it has found in the current workspace. 

![Screenshot](./images/createtarget.png?raw=true)

Select the one that you wish to assemble with `BeebAsm`, and a new build target will be created in your workspace.

![Screenshot](./images/targetcreated.png?raw=true)

A `tasks.json` file will be created in a `.vscode` folder in your workspace containing the required tasks to build or run your targets.

![Screenshot](./images/tasksjson.png?raw=true)


## 5. Build the target
Press `F7` or `Ctrl+Shift+B` and Visual Studio Code will build(assemble) the source file you selected and output a disk image `<sourcefile>.ssd`.

Any errors output by the assembler will be captured in Visual Studio Code's `Problems` view.

## 6. Run the target
Press `F9` or `Ctrl+Shift+T` and Visual Studio Code will run your disk image with the currently configured emulator (`BeebEm` by default)

**That's it! Have fun!**

# Advanced Usage

## Changing Assembler and/or Emulator configuration
If you wish to change your Assembler or Emulator configuration, go to `File->Preferences->User Settings` in Visual Studio Code, the editor will present current user preferences. Scroll to the bottom of the configuration until you see the BeebVSC settings. Copy the settings `"beebvsc.assembler"` and `"beebvsc.emulator"` across to your user settings and modify accordingly. Note that although full paths to executables can be included here, we do not recommend this since they are not portable if your project source is shared.

![Screenshot](./images/usersettings.PNG?raw=true)

## Managing multiple build targets
You can run the add build target command multiple times to add additional source files to the list of build targets in the `tasks.json` file.

## Switching between build targets
It is possible to switch between build targets as follows:

Press `F6` and the extension will provide a drop down list of build targets currently in the `tasks.json` file. 

![Screenshot](./images/selecttarget.png?raw=true)

The selection you make will become the new default 'build' and 'test' target, which can then be built as normal by pressing `F7` or `Ctrl+Shift+B`, or similarly, pressing `F9` or `Ctrl+Shift+T` to run in the emulator.

**NOTE:** It is not possible to add duplicate targets, also note that only one target can be built at once.

## Listing commands
Press `Ctrl+Shift+P` to open the command palette. In here you will see the BeebVSC commands listed for reference/convenience.

![Screenshot](./images/commands.png?raw=true)

## Running specific tasks
BeebVSC takes advantage of standard Visual Studio Code 'tasks', which are just a list of named shell commands stored in the `.vscode/tasks.json` file. Each task is 'runnable' in its own right, so another useful shortcut is `Ctrl+Shift+R` to list all of the current tasks, which you can then manually select.

![Screenshot](./images/runtasks.png?raw=true)

## Adding custom tasks
The BeebVSC extension is careful to preserve the contents of the `tasks.json` file. Therefore once targets(tasks) have been added, is very easy to manually configure or override them by simply making modifications to the `tasks.json` file directly:
- You can rename targets if you wish, there is no logic dependent on this
- You can modify commandline arguments if you wish
- You can your own additional commandline tasks if you like (eg. for compiling other data etc.)
- You can manually remove tasks if you wish


The only property that is managed by the extension is `Group -> Kind`, so this is subject to modification.
Note also that the commandline argument for the test task is managed by the extension, and updates whenever a new build target is selected.

## Command Line format
Due to constraints in the way that Visual Studio Code handles tasks, BeebVSC tasks must be executed as single arguments to a shell such as `"cmd.exe"`.

## Linux/Mac support
The installation is for Windows by default, but its quite feasible to get it working for Linux and MacOS. Primarily this is done by changing the settings for `"beebvsc.assembler"` and `"beebvsc.emulator"`.

# Release notes

- **0.1.0** - Move to LSP client/server structure, add hovers, completions, diagnostics and reference finding
- **0.0.6** - Added full build environment support via JS script to extension
- **0.0.5** - Test version
- **0.0.4** - Test update
- **0.0.3** - Initial version

**Possible further features to add**
- Support for BBC BASIC text files (can be compiled to SSD via BeebAsm) and full syntax colouring
- Support 'remove target' feature
- Support different 6502 assemblers
- Support full 6502 debugging via a VSC debug-adapter (way beyond my pay grade, but maybe someone out there fancies a challenge! ;))



# Footnotes

## Source code
The extension uses TypeScript, as that is the language used for most online examples, especially those from MicroSoft.
There are some tests (not very high coverage). These can be run from the Testing side-panel in VS Code by installing the Mocha Test Explorer from the extensions marketplace.
To get the tests to show up, you may need to go to the command palette and select "Mocha Test Explorer: Enable for a workspace folder" command.  

The project includes an adapted version of BeebAsm version 1.10 to perform the code analysis, helping to identify potential compile issues as you type. It was converted to TypeScript, changed to capture all errors instead of exiting on the first error and enhanced with the ability to capture information about the code that drives functionality such as code completion and reference finding. This remains under the GPL and is in a separate folder /server/src/beebasm-ts.

Also incuded is the [JavaScript port of strftime() by T. H. Doan](https://thdoan.github.io/strftime/) for implementing the `TIME$` functionality.

Contributions, suggestions or bug reports to this extension are welcome, via the [Beeb-VSC](https://github.com/simondotm/beeb-vsc) GitHub repository

## Syntax parsing
The language syntax system VSC uses is based on TextMate, which basically a bunch of regular expressions.
For your sanity when messing with these, I highly recommend [this site](https://regex101.com/) to help make sense of those regexes!

## Building this VSC extension
If you are looking at this repo to help you write your own VSC extension, great!, that's exactly how I figured it out too, so here's some tips for you, (as well as a future reference for me!)

To build [VSC extensions](https://code.visualstudio.com/docs/extensions/overview), you'll need to install node.js (I used [chocolatey](https://chocolatey.org/) on Windows for this)

If you are building/testing the extension, you'll need to clone the repo, then type `npm install` in the workspace folder to install the `node_modules` packages.

Finally, use the [vsce tool to publish](https://code.visualstudio.com/docs/tools/vscecli) (you'll need to setup an account on Microsoft team services site so you can publish the extension to their [marketplace](https://code.visualstudio.com/docs/editor/extension-gallery)).

## Kudos

The official Microsoft documentation for Visual Studio Code extensions is still a bit light on detail, so I figured out a lot by simply looking at how other folks had implemented bits and pieces in their extensions. So here's a list of useful references:

- [A nice little Project Manager Extension for Visual Studio Code](https://github.com/alefragnani/vscode-project-manager)
- [Cordova VSC Extension](https://github.com/Microsoft/vscode-cordova)
- [VSCE keybindings documentation](https://code.visualstudio.com/docs/customization/keybindings#_preferences)
- [Node.js fs module documentation](https://nodejs.org/api/fs.html)
- [Microsoft's official Visual Studio Code Github repo](https://github.com/Microsoft/vscode)
- [VSCE Tasks documentation](https://code.visualstudio.com/docs/editor/tasks#_running-multiple-commands)
- [Brilliant regular expressions sandbox](https://regex101.com/#javascript)
- [Language Server Protocol specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification)
- [VS Code extension samples](https://github.com/microsoft/vscode-extension-samples)

BBC Micro/6502 Resources:
- [Rich Talbot-Watkin's rather brilliant BeebAsm project](https://github.com/stardot/beebasm/blob/master/README.md)
- [BeebEm Emulator](http://www.mkw.me.uk/beebem/index.html)
- [Stardot Acorn/BBC Micro forums](http://stardot.org.uk/forums/)



