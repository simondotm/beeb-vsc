# Extension Development

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

## Useful References

The official Microsoft documentation for Visual Studio Code extensions is great, but I also figured out a lot by simply looking at how other folks had implemented bits and pieces in their extensions. So here's a list of useful references:

- [A nice little Project Manager Extension for Visual Studio Code](https://github.com/alefragnani/vscode-project-manager)
- [Cordova VSC Extension](https://github.com/Microsoft/vscode-cordova)
- [VSCE keybindings documentation](https://code.visualstudio.com/docs/customization/keybindings#_preferences)
- [Node.js fs module documentation](https://nodejs.org/api/fs.html)
- [Microsoft's official Visual Studio Code Github repo](https://github.com/Microsoft/vscode)
- [VSCE Tasks documentation](https://code.visualstudio.com/docs/editor/tasks#_running-multiple-commands)
- [Brilliant regular expressions sandbox](https://regex101.com/#javascript)
- [Language Server Protocol specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification)
- [VS Code extension samples](https://github.com/microsoft/vscode-extension-samples)