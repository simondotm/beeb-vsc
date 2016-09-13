# Beeb VSC
[Visual Studio Code](https://code.visualstudio.com/) Extension to support simple code development for BBC Micro.

Visual Studio Code is free and really good for general retro/6502 development, so this extension was created to enhance the experience by providing syntax colouring for 6502 opcodes, labels, and BBC BASIC commands & functions supported by [BeebAsm](https://github.com/tom-seddon/beebasm).

## Supported syntax:
- All **6502 op-codes** (no 65C02 op codes yet)
- **.label** style labels
- **$** or **&** style hex constants
- All **BBC BASIC** style keywords (such as TAN, RND, MOD, DIV etc.)
- All **BeebAsm** directives (such as ORG, GUARD, SKIP etc.)

## Supported Filetypes:
- .6502
- .asm
- .s


# Installation

Press CTRL+Shift+X in VSCode, look for beeb vsc or beebasm, click install and away you go.

# Usage

Syntax colouring is automatic for .6502 .asm or .s files.

![Screenshot](https://github.com/simondotm/beeb-vsc/blob/master/images/example.png?raw=true)


# Source code

You can contribute to this extension by adding improvements or reporting issues via the [Beeb-VSC](https://github.com/simondotm/beeb-vsc) GitHub repository

I'm interested in looking into seeing if a full BeebAsm / BeebEm build environment could be created within Visual Studio so I welcome any suggestions!

Have fun!

# Release notes

0.0.3 - Initial version


