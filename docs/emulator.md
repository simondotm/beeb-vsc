# Using the Integrated JSBeeb Emulator

The BeebVSC extension includes an integrated BBC Micro emulator, powered by [JSBeeb](https://github.com/mattgodbolt/jsbeeb).

This integrated emulator is just for assisting with previewing, testing & development purposes and works alongside any standalone external emulator that you may be using with the `tasks.json` file.

## Launching the Emulator

To launch the integrated emulator, open the command palette (Ctrl+Shift+P) and type `BeebVSC: Open Emulator`.

![Screenshot](./images/emulator-palette.png?raw=true)

You can also launch the emulator with an auto-booted `.ssd` or `.dsd` file from your workspace by right clicking the file in the explorer and selecting `Open Emulator`.

![Screenshot](./images/emulator-context-menu.png?raw=true)


The emulator will open in a new tab in Visual Studio Code.

![Screenshot](./images/emulator-view.png?raw=true)

## Emulator Controls

The emulator controls are as follows:

1. Pause/Resume the Emulator
2. Reboot the Emulator (CTRL+BREAK)
3. Select the Model to emulate
4. Load a disk image from your workspace
5. Mute/Unmute audio
6. Full screen or zoomed CRT display
7. Click this button if you wish to enable audio in the Emulator view

![Screenshot](./images/emulator-controls.png?raw=true)

## Emulator Models

The emulator supports the following models:

![Screenshot](./images/emulator-model.png?raw=true)

> _Please note that this is an early beta version of the integrated emulator, and not all model specifications may work correctly yet._
