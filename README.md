# Beeb VSC
[Visual Studio Code](https://code.visualstudio.com/) Extension to support code development primarily for BBC Micro, but it might be useful for other 6502 based machines.

Visual Studio Code is free and really good for general retro/6502 development, so this extension was created to enhance the experience by providing syntax colouring for 6502 opcodes, labels, and BBC BASIC commands & functions supported by [BeebAsm](https://github.com/tom-seddon/beebasm).


# Features


## Syntax Highlighting:
- All **6502 op-codes** (no 65C02 op codes yet)
- **.label** style labels
- **$** or **&** style hex constants
- All **BBC BASIC** style keywords (such as TAN, RND, MOD, DIV etc.)
- All **BeebAsm** directives (such as ORG, GUARD, SKIP etc.)

## Supported Filetypes:
- .6502
- .asm
- .s

## Build tools
- Assemble & test 6502 projects all within Visual Studio Code
- Uses Visual Studio Code tasks for building & testing
- Easily create new build targets (supports multiple targets within a project folder)
- Easily select 'default' build targets  
- Run build targets in the emulator of your choice

# Quick Setup

## Install the extension
Press CTRL+Shift+X in VSCode, search for 'beeb vsc' or 'beebasm', click install.

## Load your project
Open your project folder in VSC

## Configure your Assembler and emulator
Go to `File->Preferences->User Settings` in Visual Studio Code, the editor will present current user preferences. Scroll to the bottom of the configuration until you see the BeebVSC settings.
![Screenshot](https://github.com/simondotm/beeb-vsc/blob/master/images/example.png?raw=true)
- 


# Usage

Syntax colouring is automatic for .6502 .asm or .s files.

![Screenshot](https://github.com/simondotm/beeb-vsc/blob/master/images/example.png?raw=true)


# Source code

You can contribute to this extension by adding improvements or reporting issues via the [Beeb-VSC](https://github.com/simondotm/beeb-vsc) GitHub repository

I'm interested in looking into seeing if a full BeebAsm / BeebEm build environment could be created within Visual Studio so I welcome any suggestions!

Have fun!

# Release notes

0.0.3 - Initial version


# Footnotes

## Syntax parsing
The language syntax system VSC uses is based on TextMate, which basically a bunch of regular expressions.
For your sanity when messing with these, I highly recommend [this site](https://regex101.com/) to help make sense of those regexes!

## Building VSC extensions
If you are looking at this repo to help you write your own VSC extension, great!, that's exactly how I figured it out too, so here's some tips for you, (as well as a future reference for me!)

To build [VSC extensions](https://code.visualstudio.com/docs/extensions/overview), you'll need to install node.js (I used [chocolatey](https://chocolatey.org/) on Windows for this), and setup an account on Microsoft team services site so you can publish the extension to their [marketplace](https://code.visualstudio.com/docs/editor/extension-gallery).

Finally, use the [vsce tool to publish](https://code.visualstudio.com/docs/tools/vscecli).

## Added JavaScript functionality


