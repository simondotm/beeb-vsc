//========================================================================================
// BeebVSC
// Visual Studio Code Extension to support 6502/BBC Micro development
// This script provides functionality to manage build targets via VSC tasks
//----------------------------------------------------------------------------------------
//  Author: simondotm (https://github.com/simondotm)
//  GitHub: https://github.com/simondotm/beeb-vsc
// License: MIT
//----------------------------------------------------------------------------------------
// Notes:
// In principle this script could be generalised to use different assemblers, but I thought
//  it was best to focus on BeebAsm initially.
//----------------------------------------------------------------------------------------
// Thanks to the following projects for providing inspiration:
// https://github.com/mirao/mads
// https://github.com/alefragnani/vscode-project-manager
//========================================================================================

import * as path from 'path'
import * as fs from 'fs'
import {
  workspace,
  ExtensionContext,
  window,
  commands,
  Uri,
  debug,
} from 'vscode'
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node'
import { EmulatorPanel } from './panels/emulator-panel'
import { FeatureFlags, isFeatureEnabled } from '../types/shared/config'
import { initialiseExtensionTelemetry } from './utils/extension-telemetry'
import {
  InlineDebugAdapterFactory,
  JSBeebConfigurationProvider,
} from './debugger/debugger'

let client: LanguageClient

interface BeebVSCSettings {
  beebvsc: {
    sourceFile: string | string[]
    targetName: string
  }
}

interface VSTaskGroup {
  kind: string
  isDefault: boolean
}
interface VSTask {
  label: string
  type: string
  script?: string
  problemMatcher?: string[] | VSProblemMatcher
  command: string
  args?: string[]
  group?: string | VSTaskGroup
  presentation?: {
    panel: string
    reveal: string
  }
}

interface VSTasks {
  version: string
  tasks: VSTask[]
}

interface VSProblemMatcher {
  owner: string
  fileLocation: string[]
  pattern: {
    regexp: string
    file: number
    line: number
    severity: number
    message: number
  }
}

// utils
const getWorkspacePath = () =>
  workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : './'
const getVSCodePath = () => path.join(getWorkspacePath(), '.vscode')
const getTasksPath = () => path.join(getVSCodePath(), 'tasks.json')
const fileExists = (path: string) =>
  fs.existsSync(path) && fs.statSync(path).isFile()
const dirExists = (path: string) =>
  fs.existsSync(path) && fs.statSync(path).isDirectory()
const getAssemblerPath = () =>
  workspace.getConfiguration('beebvsc').get<string>('assembler') ?? './'
const getEmulatorPath = () =>
  workspace.getConfiguration('beebvsc').get<string>('emulator') ?? './'

//----------------------------------------------------------------------------------------
// the list of source filename extensions we recognize as assembler/source files
// these are used to filter the list of files in the current workspace folder
// to find the source file to use as the root file for the build process
//----------------------------------------------------------------------------------------
const supportedFileTypes = ['asm', '6502', 's']

//----------------------------------------------------------------------------------------
// the default filename extension of target filenames
// these are only applied when targets are first created.
// user can manually override this in the tasks.json file (eg. if .DSD preferred)
//----------------------------------------------------------------------------------------
const targetExt = '.ssd'

//----------------------------------------------------------------------------------------
// the default ProblemMatcher for BeebAsm assembler output
// ProblemMatcher's are used to parse output from compilers etc. to capture warnings/errors within the IDE
// BeebAsm output format is <filename>:<line>: <errortype>: <error details>
// BeebAsm doesn't indicate column of the error, but BeebAsm usually emits the offending line with a '^' underneath pointing to the problem area
//----------------------------------------------------------------------------------------
const problemMatcher: VSProblemMatcher = {
  owner: '6502',
  fileLocation: ['relative', '${workspaceRoot}'],
  pattern: {
    regexp: '^(.*):(\\d+):\\s+(warning|error):\\s+(.*)$',
    file: 1,
    line: 2,
    severity: 3,
    message: 4,
  },
}

//----------------------------------------------------------------------------------------
// The default tasks.json file template, we will add specific tasks to this
//----------------------------------------------------------------------------------------
const tasksHeader = {
  version: '2.0.0',
  tasks: [],
}

export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('BeebVSC extension activated!')
  console.log('path ' + getWorkspacePath())

  initialiseExtensionTelemetry(context)

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  // Create a new build target
  context.subscriptions.push(
    commands.registerCommand('extension.target.create', () => {
      createTargetCommand()
    }),
  )
  // Set a new default build target
  context.subscriptions.push(
    commands.registerCommand('extension.target.select', () => {
      selectTargetCommand()
    }),
  )
  // Run (Test) the current build target - just a wrapper for the "Run test task"
  context.subscriptions.push(
    commands.registerCommand('extension.target.run', () => {
      commands.executeCommand('workbench.action.tasks.test')
    }),
  )
  // Build the current target - just a wrapper for the "Run build task"
  context.subscriptions.push(
    commands.registerCommand('extension.target.build', () => {
      commands.executeCommand('workbench.action.tasks.build')
    }),
  )

  function setFeatureFlagContext(flag: FeatureFlags) {
    commands.executeCommand(
      'setContext',
      `extension.feature.${flag}`,
      isFeatureEnabled(flag),
    )
  }

  const emulatorEnabled = isFeatureEnabled('emulator')
  // allow `when` clauses in the package.json contributions to check if the emulator is enabled for context menus
  setFeatureFlagContext('emulator')
  setFeatureFlagContext('emulatorContextMenu')

  if (emulatorEnabled) {
    if (isFeatureEnabled('emulatorContextMenu')) {
      //WIP
      context.subscriptions.push(
        commands.registerCommand(
          'extension.emulator.option1',
          (contextSelection: Uri, allSelections: Uri[]) => {
            window.showInformationMessage(
              'BeebVSC: extension.emulator.option1 selected',
            )
          },
        ),
      )
      context.subscriptions.push(
        commands.registerCommand(
          'extension.emulator.option2',
          (contextSelection: Uri, allSelections: Uri[]) => {
            window.showInformationMessage(
              'BeebVSC: extension.emulator.option2 selected',
            )
          },
        ),
      )
    }

    context.subscriptions.push(
      commands.registerCommand(
        'extension.emulator.start',
        (contextSelection: Uri | undefined, allSelections: Uri[]) => {
          EmulatorPanel.show(context, contextSelection, allSelections)
        },
      ),
    )

    // Register the custom command
    context.subscriptions.push(
      commands.registerCommand('extension.createSourceMap', async () => {
        const response = await client.sendRequest('custom/requestSourceMap', {
          text: 'Hello, server!',
        })
        window.showInformationMessage(`Response from server: ${response}`)
      }),
    )

    // Debug the current file
    context.subscriptions.push(
      commands.registerCommand(
        'extension.jsbeebdebugger.debug',
        (contextSelection: Uri | undefined, allSelections: Uri[]) => {
          EmulatorPanel.show(context, contextSelection, allSelections)
          // Start debugger session
          // Configuration must match the details in package.json?
          debug.startDebugging(undefined, {
            name: 'Debug with JSBeeb',
            type: 'jsbeebdebugger',
            request: 'launch',
            diskImage: contextSelection?.fsPath,
            enableLogging: false,
            stopOnEntry: true,
            cwd: workspace.workspaceFolders![0].uri.fsPath,
          })
        },
      ),
    )

    // register a configuration provider for 'jsbeebdebugger' debug type
    const provider = new JSBeebConfigurationProvider()
    context.subscriptions.push(
      debug.registerDebugConfigurationProvider('jsbeebdebugger', provider),
    )

    // TODO: register a dynamic configuration provider if needed

    // Register the debug adapter factory
    // This will allow the extension to provide a custom debug adapter for the debugger
    const factory = new InlineDebugAdapterFactory()
    context.subscriptions.push(
      debug.registerDebugAdapterDescriptorFactory('jsbeebdebugger', factory),
    )
  }

  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'))

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  }

  // Get beebvsc.sourceFile from settings
  // const config = workspace.getConfiguration('beebvsc');
  // const rootfile = config.get('sourceFile');
  // TODO - when adding tasks.json, use link to rootfile via ${config:beebvsc.sourceFile}

  const clientOptions: LanguageClientOptions = {
    // Register the server for beebasm documents
    documentSelector: [{ scheme: 'file', language: 'beebasm' }],
    synchronize: {
      // Notify the server about file changes to the settings.json file
      fileEvents: workspace.createFileSystemWatcher('**/.vscode/settings.json'),
    },
  }

  // Warn if no sourceFile is set in settings.json
  checkSourceFilesSpecified()

  // Start the client. This will also launch the server
  client = new LanguageClient(
    'BeebVSC',
    'Beeb VSC',
    serverOptions,
    clientOptions,
  )
  client.start()
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined
  }
  return client.stop()
}

// checkSourceFilesSpecified
function checkSourceFilesSpecified() {
  let settingsIssue: boolean = false
  const settingsPath = path.join(getWorkspacePath(), '.vscode', 'settings.json')
  let fixable = false
  if (fileExists(settingsPath)) {
    // settings.json exists, so load it
    let settingsObject: Partial<BeebVSCSettings> = {}
    try {
      settingsObject = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    } catch (err) {
      settingsIssue = true
      console.log('Error reading ' + settingsPath + ' ' + err)
    }
    if (settingsObject.beebvsc === undefined) {
      settingsIssue = true
      fixable = true
      console.log('Error with settingsObject.beebvsc === undefined')
    } else {
      if (settingsObject.beebvsc.sourceFile === undefined) {
        settingsIssue = true
        console.log(
          'Error with settingsObject.beebvsc.sourceFile === undefined',
        )
      }
    }
  } else {
    settingsIssue = true
    fixable = true
    console.log('Error with settingsPath not existing ' + settingsPath)
  }
  if (settingsIssue && !fixable) {
    window.showErrorMessage(
      "BeebVSC: 'Could not find sourceFile in settings\nPlease add targets using the 'BeebVSC: Create New Build Target' command",
    )
  } else if (settingsIssue) {
    console.log('Trying to create settings.json from tasks.json')
    const tasksObject = loadTasks()
    if (tasksObject === null) {
      console.log(
        'Error loading tasks.json file - could not create settings.json',
      )
      return
    }
    const tasks = tasksObject.tasks
    if (tasks.length === 0) {
      console.log(
        'No targets available in tasks.json file - could not create settings.json',
      )
      return
    }
    const settings = tryGetSettingsFromTasks(tasksObject, tasks)
    if (
      Array.isArray(settings.beebvsc.sourceFile) &&
      settings.beebvsc.sourceFile.length > 0
    ) {
      CreateNewLocalSettingsJson(
        settings.beebvsc.sourceFile,
        settings.beebvsc.targetName,
      )
    }
  }
}

// Loop throught tasks object then create settings.json from the tasks object
// by extracting the sourceFile name (entry in args array of the task after the -i entry)
// and the targetName (entry in args array after the -do entry)
function tryGetSettingsFromTasks(
  tasksObject: VSTasks,
  tasks: VSTask[],
): BeebVSCSettings {
  const sourceFiles: string[] = []
  let targetName: string = ''
  const version = tasksObject.version
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    let args = task.args
    if (args !== undefined) {
      // version 0.1.0, args is an array with one string inside of format 'BeebAsm.exe -v -i main.asm -do main.ssd etc.'
      // version 2.0.0, args is an array of strings e.g. ['-v', '-i', 'main.asm', '-do', 'main.ssd', etc.]
      if (version === '0.1.0' && args.length === 1) {
        args = args[0].split(' ')
      }
      for (let i = 0; i < args.length - 1; i++) {
        if (args[i] === '-i') {
          sourceFiles.push(args[i + 1])
          break
        }
      }
      for (let i = 0; i < args.length - 1; i++) {
        if (args[i] === '-do') {
          targetName = args[i + 1] // Will get overwritten if multiple tasks but presume all have same target
          break
        }
      }
    }
  }
  console.log('Adding details to settings.json: ' + sourceFiles)
  // CreateNewLocalSettingsJson(sourceFiles, targetName)
  return { beebvsc: { sourceFile: sourceFiles, targetName: targetName } }
}

//----------------------------------------------------------------------------------------
// check pre-requisites for a build-related command
// returns true if configuration is ok or false otherwise.
//----------------------------------------------------------------------------------------
function checkConfiguration(): boolean {
  // First check that the user has configured assembler & emulator settings
  const assemblerPath = getAssemblerPath()
  const emulatorPath = getEmulatorPath()

  if (!assemblerPath || !emulatorPath) {
    // config is not set properly, prompt user to set these first then return
    window
      .showErrorMessage(
        'BeebVSC global assembler/emulator configurations not set. Set them now?',
        'Yes',
      )
      .then((item) => {
        if (item === 'Yes') {
          // show settings (filtered to BeebVSC settings)
          commands.executeCommand('workbench.action.openSettings', 'BeebVSC')
          window.showInformationMessage(
            "Add the 'beebvsc.assembler' and 'beebvsc.emulation' properties to your user or workspace settings file.",
          )
        } else {
          console.log('checkConfiguration failed - missing configuration')
        }
      })
    return false // Might have been set now but don't want to have to re-check, so return false and let user try task again
  }

  // TODO: check that the configured assembler & emulator can be 'reached', via path environment var or directly.
  console.log('checkConfiguration passed')
  return true
}

function CreateNewLocalSettingsJson(sourceFiles: string[], targetName: string) {
  // create a new settings.json file in the .vscode folder
  // this will be used to store local settings for the current workspace
  // (eg. assembler/emulator paths)
  const settingsPath = path.join(getWorkspacePath(), '.vscode', 'settings.json')

  const settingsObject: BeebVSCSettings = {
    beebvsc: {
      sourceFile: sourceFiles,
      targetName: targetName,
    },
  }
  if (!fileExists(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(settingsObject, null, 4))
  } else {
    // add the new settings to the existing settings.json file (we know that
    // there is no beebvsc object in the settings.json file as checked by the caller)
    const currentSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    currentSettings.beebvsc = settingsObject.beebvsc
    fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 4))
  }
}

//----------------------------------------------------------------------------------------
// sets the build target with the given named 'target' as the default build command
// also sets the test target to run the given named 'target'
//----------------------------------------------------------------------------------------
function setCurrentTarget(
  tasksObject: VSTasks,
  targetLabel: string,
  targetFile: string = '',
): void {
  // first find the target and set it as the default build
  const tasks = tasksObject['tasks']
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (typeof task.group === 'object' && task.group.kind === 'build') {
      if (task.label === targetLabel) {
        task.group.isDefault = true
        if (targetFile === '') {
          // try to get target file (disk image) from the task args
          targetFile = findTargetName(targetLabel, tasks)
          if (targetFile === '') {
            // no target file specified, so use the default target file
            targetFile = getTargetName(
              workspace.getConfiguration('beebvsc').get<string>('sourceFile') ??
              'main.asm',
            )
          }
        }
      } else {
        // not the target we want to set as default, so set it as false
        task.group.isDefault = false
      }
    }
  }

  // next, find the test task and update it to run the new target
  let foundTestTask = false
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (typeof task.group === 'object' && task.group.kind === 'test') {
      foundTestTask = true
      task.args = [targetFile]
      break
    }
  }

  // if no test task was found, create one.
  if (!foundTestTask) {
    tasks.push({
      label: 'BeebVSC Test Target',
      type: 'shell',
      command: getEmulatorPath(),
      args: [targetFile],
      group: { kind: 'test', isDefault: true },
    })
  }
}

//----------------------------------------------------------------------------------------
// Create a new build target within the tasks.json configuration
// If no tasks.json file already exists, one will be created
// Otherwise the new target will be added to the tasks list
// We also check for and prevent duplicate targets
// The user is prompted to select a source file from the workspace as the new build target
// The details of the new target are also saved to the local settings.json file
//----------------------------------------------------------------------------------------
function createTargetCommand(): void {
  // to create a new target some pre-requisites are needed
  // assembler configuration must be set (user or workspace) - prompt to set if not
  // emulator configuration must be set (user or workspace) - prompt to set if not
  if (!checkConfiguration()) {
    return
  }

  // Create list of files in the root folder with the supported file extensions
  const rootPath = getWorkspacePath()
  let targetList = fs.readdirSync(rootPath, {
    encoding: 'utf-8',
    recursive: true,
  })
  targetList = targetList.filter((file) =>
    supportedFileTypes.includes(file.split('.').pop()!),
  )
  // check that files are really files not folders
  targetList = targetList.filter((file) =>
    fs.statSync(path.join(rootPath, file)).isFile(),
  )

  // show popup list picker in VSC for user to select desired new target file
  const pickOptions = {
    ignoreFocusOut: true,
    placeHolder: 'Create New Build Target: Select a source file',
  }
  window.showQuickPick(targetList, pickOptions).then((selection) => {
    // if focus lost, or user cancelled
    if (selection === undefined) {
      console.log('bad selection')
      return
    }
    console.log("selected '" + selection + "'")

    // now we load the tasks.json
    const tasksObject = loadTasks()
    // sanity check - can't see how this might happen unless running on weird platform or with weird file permissions
    if (tasksObject === null) {
      window.showErrorMessage(
        "BeebVSC: 'Error loading tasks.json file' - contact developer",
      )
      return
    }

    // Generate the target(output) filename
    const target = getTargetName(selection)

    // get the tasks array, we will add out new target here
    const tasks = tasksObject.tasks

    // Check if this target is already present, we don't handle this presently
    // TODO: offer option to replace
    for (let i = 0; i < tasks.length; i++) {
      if (target.toLowerCase() === tasks[i].label.toLowerCase()) {
        window.showErrorMessage(
          "BeebVSC: Can't add target '" + target + "' as it already exists",
        )
        return
      }
    }

    // Create the new build target
    const label = 'BeebVSC Build Target ' + "'" + target + "'"
    const task: VSTask = {
      label,
      type: 'shell',
      problemMatcher,
      command: getAssemblerPath(),
    }

    // Create BeebAsm commandline arguments
    let bootTarget: string | undefined
    let DFSBootTargetList: string[] = []
    // add selection to list, excluding the extension (could check for valid name here?)
    const ext = selection.lastIndexOf('.')
    if (ext === -1) {
      DFSBootTargetList.push(selection)
    } else {
      DFSBootTargetList.push(selection.substring(0, ext))
    }
    // Do a quick scan of the file to see if there are any SAVE commands
    DFSBootTargetList = DFSBootTargetList.concat(GetSAVECommands(selection))
    // If the list is empty, return 'Main'
    if (DFSBootTargetList.length === 0) {
      bootTarget = 'Main'
    }
    // If the list has one entry, return that
    if (DFSBootTargetList.length === 1) {
      bootTarget = DFSBootTargetList[0]
    }
    // If have set the target, write files, otherwise ask use for option
    if (bootTarget !== undefined) {
      FinaliseThenSaveTasks(
        task,
        tasks,
        tasksObject,
        label,
        selection,
        target,
        bootTarget,
        rootPath,
      )
      return
    }
    // Present the user with a list of options
    const pickOptions = {
      ignoreFocusOut: true,
      placeHolder: "Select a file to boot from (Default: 'Main')",
    }
    window.showQuickPick(DFSBootTargetList, pickOptions).then((bootTarget) => {
      // if focus lost, or user cancelled
      if (bootTarget === undefined) {
        console.log("bad selection, defaulting to 'Main'")
        bootTarget = 'Main'
      }
      console.log("Booting to '" + bootTarget + "'")
      FinaliseThenSaveTasks(
        task,
        tasks,
        tasksObject,
        label,
        selection,
        target,
        bootTarget,
        rootPath,
      )
    })
  })
}

function FinaliseThenSaveTasks(
  task: VSTask,
  tasks: VSTask[],
  tasksObject: VSTasks,
  label: string,
  selection: string,
  target: string,
  bootTarget: string,
  rootPath: string,
) {
  task.args = ['-v', '-i', selection, '-do', target, '-boot', bootTarget]
  task.group = { kind: 'build', isDefault: true }

  // Add the new task to the tasks array
  tasks.push(task)

  // set as the default build and create test task to point to it
  setCurrentTarget(tasksObject, label, target)

  SaveJSONFiles(tasksObject, target, selection, rootPath)
}

function SaveJSONFiles(
  tasksObject: VSTasks,
  targetDiskImage: string,
  selection: string,
  rootPath: string,
): void {
  // write the new tasks.json file
  if (saveTasks(tasksObject)) {
    window.showInformationMessage(
      "BeebVSC: New build target '" + targetDiskImage + "' created",
    )
  } else {
    window.showErrorMessage(
      "BeebVSC: 'Error saving tasks.json file' - contact developer",
    )
  }
  // Now want to save the selection to the settings.json file in the .vscode folder
  // Check if it exists first
  const settingsPath = path.join(getWorkspacePath(), '.vscode', 'settings.json')
  if (!fileExists(settingsPath)) {
    CreateNewLocalSettingsJson([selection], targetDiskImage)
  } else {
    // settings.json exists, so load it
    let settingsObject: Partial<BeebVSCSettings> = {}
    try {
      settingsObject = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      console.log('settings.json loaded')
    } catch (err) {
      window.showErrorMessage('Could not load settings.json file')
      return
    }
    // now add the new settings
    console.log('Setting beebvsc object to settings.json')
    const currentSourceFile = settingsObject.beebvsc?.sourceFile
    let newSourceFile: string[] = []
    if (typeof currentSourceFile === 'string') {
      newSourceFile.push(currentSourceFile)
    } else if (Array.isArray(currentSourceFile)) {
      newSourceFile = currentSourceFile ?? []
    } else {
      newSourceFile = []
    }
    if (
      !newSourceFile.includes(path.join(rootPath, selection)) && // legacy check for full path
      !newSourceFile.includes(selection)
    ) {
      newSourceFile.push(selection)
    }
    settingsObject.beebvsc = {
      sourceFile: newSourceFile,
      targetName: targetDiskImage,
    }

    // save the settings.json file
    try {
      const output = JSON.stringify(settingsObject, null, 4)
      fs.writeFileSync(settingsPath, output, 'utf8')
    } catch (err) {
      window.showErrorMessage(
        "BeebVSC '" + err + "', when saving file 'settings.json'",
      )
      console.log("error saving settings.json '" + err + "'")
      return
    }
    console.log('settings.json saved')
  }
}

//----------------------------------------------------------------------------------------
// present the user with a list of current build targets in the tasks.json file
// any selection will update the tasks.json file to have the new target as the default
// build target.
// the tests tasks will also be updated to reflect the new build target.
//----------------------------------------------------------------------------------------
function selectTargetCommand(): void {
  // to select a default target some pre-requisites are needed
  // assembler configuration must be set (user or workspace) - prompt to set if not
  // emulator configuration must be set (user or workspace) - prompt to set if not
  if (!checkConfiguration()) return

  // Plus must have at least one target in the list of tasks
  // now we load the tasks.json
  const tasksObject = loadTasks()
  // sanity check - can't see how this might happen unless running on weird platform or with weird file permissions
  if (tasksObject === null) {
    window.showErrorMessage(
      "BeebVSC: 'Error loading tasks.json file' - could not select new target",
    )
    return
  }

  const targetList = []
  const tasks = tasksObject.tasks
  if (tasks.length === 0) {
    window.showErrorMessage('BeebVSC: No targets available in tasks.json file')
    return
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (typeof task.group === 'object' && task.group.kind === 'build') {
      targetList.push(task.label)
    }
  }

  // show popup list picker in VSC for user to select desired new target file
  const pickOptions = {
    ignoreFocusOut: true,
    placeHolder: 'Select a build target Choose a new default target file',
  }
  window.showQuickPick(targetList, pickOptions).then((selection) => {
    // if focus lost, or user cancelled
    if (selection === undefined) {
      console.log('bad selection')
      return
    }
    console.log("selected '" + selection + "'")

    // set the selection as the new default build target + test command
    setCurrentTarget(tasksObject, selection)

    // write the new tasks.json file and update settings.json
    const targetDiskImage = findTargetName(selection, tasks)
    const sourceFile = findSourceFile(selection, tasks)
    SaveJSONFiles(tasksObject, targetDiskImage, sourceFile, getWorkspacePath())
  })
}

function GetSAVECommands(ASMFilename: string): string[] {
  const saveList: string[] = []
  const rootPath = getWorkspacePath()
  // Confident this exists as we've already checked for it in calling function
  const textFile = fs.readFileSync(path.join(rootPath, ASMFilename), 'utf8')
  const lines = textFile.split('\n')

  // TODO: Exclude commented out lines
  const saveCommandRegex = /(^|:)\s*(SAVE\s+)((["'])([^\4]+)\4).*$/im
  for (let i = 0; i < lines.length; i++) {
    const match = saveCommandRegex.exec(lines[i])
    if (match !== null && match.length > 5) {
      saveList.push(match[5])
    }
  }
  return saveList
}

//----------------------------------------------------------------------------------------
// load the tasks.json file from the local workspace
// returns the file as a JS object or null if there was an error
// if no tasks.json file exists, a default will be created.
//----------------------------------------------------------------------------------------
function loadTasks(): VSTasks | null {
  if (!checkConfiguration()) {
    return null
  }

  // if no tasks.json file exists, create a default
  const tasksPath = getTasksPath()
  if (!fileExists(tasksPath)) {
    const tasksObject = tasksHeader
    // if tasks file could not be saved, return null to indicate problem
    if (!saveTasks(tasksObject)) {
      return null
    }
  }

  // load the tasks.json file
  let tasksObject: VSTasks | null = null
  try {
    const contents = fs.readFileSync(tasksPath, 'utf8')
    tasksObject = JSON.parse(contents)
    console.log('tasks.json loaded')
  } catch (err) {
    window.showErrorMessage('Could not load tasks.json file')
    return null
  }
  return tasksObject
}

function saveTasks(tasksObject: VSTasks): boolean {
  const vscodePath = getVSCodePath()
  // sanity check that .vscode is not a file
  if (fileExists(vscodePath)) {
    window.showErrorMessage(
      "BeebVSC: '.vscode' exists as a file rather than a directory! Unexpected - Please resolve.",
    )
    return false
  }

  // create .vscode directory if it doesn't exist
  if (!dirExists(vscodePath)) {
    fs.mkdirSync(vscodePath)
  }

  // now we can write the tasks.json file
  const tasksPath = getTasksPath()
  try {
    const output = JSON.stringify(tasksObject, null, 4)
    fs.writeFileSync(tasksPath, output, 'utf8')
  } catch (err) {
    window.showErrorMessage(
      "BeebVSC '" + err + "', when saving file 'tasks.json'",
    )
    console.log("error saving tasks.json '" + err + "'")
    return false
  }
  console.log('tasks.json saved')
  return true
}

function getTargetName(sourceFile: string) {
  const ext = sourceFile.lastIndexOf('.')
  if (ext === -1) {
    return sourceFile + targetExt
  } else {
    return sourceFile.substring(0, ext) + targetExt
  }
}

function findTargetName(taskLabel: string, tasks: VSTask[]) {
  return findArgument('-do', taskLabel, tasks)
}

function findSourceFile(taskLabel: string, tasks: VSTask[]) {
  return findArgument('-i', taskLabel, tasks)
}

function findArgument(
  commandLineArg: string,
  taskLabel: string,
  tasks: VSTask[],
) {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task.label === taskLabel) {
      const args = task.args
      if (args === undefined) {
        return ''
      }
      for (let i = 0; i < args.length - 1; i++) {
        if (args[i] === commandLineArg) {
          return args[i + 1]
        }
      }
    }
  }
  return ''
}
