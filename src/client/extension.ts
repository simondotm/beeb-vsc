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

import * as path from 'path';
import * as fs from 'fs';
import {
    workspace,
    ExtensionContext,
    window,
    commands,
} from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

interface BeebVSCSettings {
	beebvsc: {
		sourceFile: string;
		targetName: string;
	}
}

interface VSTaskGroup {
	kind: string;
	isDefault: boolean;
}
interface VSTask {
	label: string;
	type: string;
	script?: string
	problemMatcher?: string[] | VSProblemMatcher;
	command: string;
	args?: string[];
	group?: string | VSTaskGroup;
	presentation?: {
		panel: string;
		reveal: string;
	}

}

interface VSTasks {
	version: string;
	tasks: VSTask[];
}

interface VSProblemMatcher {
	owner: string;
	fileLocation: string[];
	pattern: {
		regexp: string;
		file: number;
		line: number;
		severity: number;
		message: number;
	}

}

// utils
const getWorkspacePath = () => workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : './';
const getVSCodePath = () => path.join(getWorkspacePath(), '.vscode'); 
const getTasksPath = () => path.join(getVSCodePath(), 'tasks.json');
const fileExists = (path: string) => fs.existsSync(path) && fs.statSync(path).isFile();
const dirExists = (path: string) => fs.existsSync(path) && fs.statSync(path).isDirectory();
const getAssemblerPath = () => workspace.getConfiguration('beebvsc').get<string>('assembler') ?? './';
const getEmulatorPath = () => workspace.getConfiguration('beebvsc').get<string>('emulator') ?? './';

//----------------------------------------------------------------------------------------
// the list of source filename extensions we recognize as assembler/source files
// these are used to filter the list of files in the current workspace folder
// to find the source file to use as the root file for the build process
//----------------------------------------------------------------------------------------
const supportedFileTypes = [ 'asm', '6502', 's' ];

//----------------------------------------------------------------------------------------
// the default filename extension of target filenames 
// these are only applied when targets are first created.
// user can manually override this in the tasks.json file (eg. if .DSD preferred)
//----------------------------------------------------------------------------------------
const targetExt = '.ssd';

//----------------------------------------------------------------------------------------
// the default ProblemMatcher for BeebAsm assembler output
// ProblemMatcher's are used to parse output from compilers etc. to capture warnings/errors within the IDE
// BeebAsm output format is <filename>:<line>: <errortype>: <error details>
// BeebAsm doesn't indicate column of the error, but BeebAsm usually emits the offending line with a '^' underneath pointing to the problem area
//----------------------------------------------------------------------------------------
const problemMatcher: VSProblemMatcher = {
    'owner': '6502',
    'fileLocation': ['relative', '${workspaceRoot}'],
    'pattern': {
        'regexp': '^(.*):(\\d+):\\s+(warning|error):\\s+(.*)$',
        'file': 1,
        'line': 2,
        'severity': 3,
        'message': 4
    }
};

//----------------------------------------------------------------------------------------
// The default tasks.json file template, we will add specific tasks to this
//----------------------------------------------------------------------------------------
const tasksHeader = {
    'version': '2.0.0',
    'tasks': []    
};


export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('BeebVSC extension activated!');
    console.log('path ' + getWorkspacePath());
	

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    // Create a new build target
    context.subscriptions.push(commands.registerCommand('extension.target.create', () => {
        createTargetCommand();
    }));
    // Set a new default build target
    context.subscriptions.push(commands.registerCommand('extension.target.select', () => {
        selectTargetCommand();
    }));
    // Run (Test) the current build target - just a wrapper for the "Run test task"
    context.subscriptions.push(commands.registerCommand('extension.target.run', () => {
        commands.executeCommand('workbench.action.tasks.test');
    }));
    // Build the current target - just a wrapper for the "Run build task"
    context.subscriptions.push(commands.registerCommand('extension.target.build', () => {
        commands.executeCommand('workbench.action.tasks.build');
    }));

	
    const serverModule = context.asAbsolutePath(
        path.join('dist', 'server.js')
    );

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc }
    };

    // Get beebvsc.sourceFile from settings
    // const config = workspace.getConfiguration('beebvsc');
    // const rootfile = config.get('sourceFile');
    // TODO - when adding tasks.json, use link to rootfile via ${config:beebvsc.sourceFile}

    const clientOptions: LanguageClientOptions = {
        // Register the server for beebasm documents
        documentSelector: [{ scheme: 'file', language: 'beebasm' }],
        // synchronize: {
        // 	// Notify the server about file changes to '.clientrc files contained in the workspace
        // 	fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        // }
    };

    // Start the client. This will also launch the server
    client = new LanguageClient('BeebVSC', 'Beeb VSC', serverOptions, clientOptions);
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

//----------------------------------------------------------------------------------------
// check pre-requisites for a build-related command
// returns true if configuration is ok or false otherwise.
//----------------------------------------------------------------------------------------
function checkConfiguration(): boolean {
    // First check that the user has configured assembler & emulator settings
    const assemblerPath = getAssemblerPath();
    const emulatorPath = getEmulatorPath();

    if (!assemblerPath || !emulatorPath) {
        // config is not set properly, prompt user to set these first then return
        window.showErrorMessage('BeebVSC global assembler/emulator configurations not set. Set them now?', 'Yes').then((item) => {
            if (item === 'Yes') {
                // show settings (filtered to BeebVSC settings)
                commands.executeCommand('workbench.action.openSettings', 'BeebVSC');
                window.showInformationMessage('Add the \'beebvsc.assembler\' and \'beebvsc.emulation\' properties to your user or workspace settings file.');
            }
            else {
                console.log('checkConfiguration failed - missing configuration');
            }
        });
        return false; // Might have been set now but don't want to have to re-check, so return false and let user try task again
    }

    // TODO: check that the configured assembler & emulator can be 'reached', via path environment var or directly.
    console.log('checkConfiguration passed');
    return true;
}


function CreateNewLocalSettingsJson(sourceFile: string, targetName: string) {
    // create a new settings.json file in the .vscode folder
    // this will be used to store local settings for the current workspace
    // (eg. assembler/emulator paths)
    const settingsPath = path.join(getWorkspacePath(), '.vscode', 'settings.json');
    const sourcePath = path.join(getWorkspacePath(), sourceFile);

    const settingsObject: BeebVSCSettings = {
        beebvsc: {
            sourceFile: sourcePath,
            targetName: targetName
        }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settingsObject, null, 4));
}

//----------------------------------------------------------------------------------------
// sets the build target with the given named 'target' as the default build command
// also sets the test target to run the given named 'target'
//----------------------------------------------------------------------------------------
function setCurrentTarget(tasksObject: VSTasks, targetLabel: string, targetFile: string = ''): void {
    // first find the target and set it as the default build
    const tasks = tasksObject['tasks'];
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (typeof task.group === 'object' && task.group.kind === 'build') {
            if (task.label === targetLabel) {
                if (targetFile === '') {
                    // no target file specified, so use the default target file
                    targetFile = getTargetName(workspace.getConfiguration('beebvsc').get<string>('sourceFile') ?? 'main.asm');
                }
            }
            else {
                // not the target we want to set as default, so set it as false
                task.group.isDefault = false;
            }
        }
    }

    // next, find the test task and update it to run the new target
    let foundTestTask = false;
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (typeof task.group === 'object' && task.group.kind === 'test') {
            foundTestTask = true;
            break;
        } 
    }

    // if no test task was found, create one.
    if (!foundTestTask) {
        tasks.push({
            label: 'BeebVSC Test Target',
            type: 'shell',
            command: getEmulatorPath(),
            args: [targetFile],
            group: { kind: 'test', isDefault: true }
        });
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
function createTargetCommand(): void
{
    // to create a new target some pre-requisites are needed
    // assembler configuration must be set (user or workspace) - prompt to set if not
    // emulator configuration must be set (user or workspace) - prompt to set if not
    if (!checkConfiguration()) {
        return;
    }

    // Create list of files in the root folder with the supported file extensions
    const rootPath = getWorkspacePath();
    let targetList = fs.readdirSync(rootPath);
    targetList = targetList.filter(file => supportedFileTypes.includes(file.split('.').pop()!));
    // check that files are really files not folders
    targetList = targetList.filter(file => fs.statSync(path.join(rootPath, file)).isFile());

    // show popup list picker in VSC for user to select desired new target file
    const pickOptions = { 'ignoreFocusOut' : true, 'placeHolder' : 'Create New Build Target: Select a source file' };
    window.showQuickPick(targetList, pickOptions).then((selection) => {
        // if focus lost, or user cancelled
        if (selection === undefined) {
            console.log('bad selection');
            return;
        }
        console.log('selected \'' + selection + '\'');

        // now we load the tasks.json
        const tasksObject = loadTasks();
        // sanity check - can't see how this might happen unless running on weird platform or with weird file permissions
        if (tasksObject === null) {
            window.showErrorMessage('BeebVSC: \'Error loading tasks.json file\' - contact developer');
            return;
        }

        // Generate the target(output) filename
        const target = getTargetName(selection);

        // get the tasks array, we will add out new target here
        const tasks = tasksObject.tasks;

        // Check if this target is already present, we don't hanlde this presently
        // TODO: offer option to replace
        for (let i = 0; i < tasks.length; i++) {
            if (target.toLowerCase() === tasks[i].label.toLowerCase()) {
                window.showErrorMessage('BeebVSC: Can\'t add target \'' + target + '\' as it already exists');
                return;
            }
        }

        // Create the new build target
        const label = 'BeebVSC Build Target ' + '\'' + target + '\'';
        const task: VSTask = {
            label,
            type: 'shell',
            problemMatcher,
            command: getAssemblerPath(),
        };

        // Create BeebAsm commandline arguments
        let bootTarget: string | undefined;
        let DFSBootTargetList: string[] = [];
        // add selection to list, excluding the extension (could check for valid name here?)
        const ext = selection.lastIndexOf('.');
        if (ext === -1) {
            DFSBootTargetList.push(selection);
        }
        else {
            DFSBootTargetList.push(selection.substring(0, ext));
        }
        // Do a quick scan of the file to see if there are any SAVE commands
        DFSBootTargetList = DFSBootTargetList.concat(GetSAVECommands(selection));
        // If the list is empty, return 'Main'
        if (DFSBootTargetList.length === 0) {
            bootTarget = 'Main';
        }
        // If the list has one entry, return that
        if (DFSBootTargetList.length === 1) {
            bootTarget = DFSBootTargetList[0];
        }
        // If have set the target, write files, otherwise ask use for option
        if (bootTarget !== undefined) {
            FinaliseThenSaveTasks(task, tasks, tasksObject, label, selection, target, bootTarget, rootPath);
            return;
        }
        // Present the user with a list of options
        const pickOptions = { 'ignoreFocusOut' : true, 'placeHolder' : 'Select a file to boot from (Default: \'Main\')' };
        window.showQuickPick(DFSBootTargetList, pickOptions).then((bootTarget) => {
            // if focus lost, or user cancelled
            if (bootTarget === undefined) {
                console.log('bad selection, defaulting to \'Main\'');
                bootTarget = 'Main';
            }
            console.log('Booting to \'' + bootTarget + '\'');
            FinaliseThenSaveTasks(task, tasks, tasksObject, label, selection, target, bootTarget, rootPath);
        });

    });
}

function FinaliseThenSaveTasks(task: VSTask, tasks: VSTask[], tasksObject: VSTasks, label: string, selection: string, target: string, bootTarget: string, rootPath: string) {
    task.args = ['-v', '-i', selection, '-do', target, '-boot', bootTarget];
    task.group = { kind: 'build', isDefault: true};

    // Add the new task to the tasks array
    tasks.push(task);

    // set as the default build and test target if this is the first task
    // TODO: check if other targets already exist, but are not set as the default build? Can do this with target select.
    if (tasks.length === 1) {
        setCurrentTarget(tasksObject, label, target);
    }

    SaveJSONFiles(tasksObject, target, selection, rootPath);
}

function SaveJSONFiles(tasksObject: VSTasks, target: string, selection: string, rootPath: string): void {
    // write the new tasks.json file
    if (saveTasks(tasksObject)) {
        window.showInformationMessage('BeebVSC: New build target \'' + target + '\' created');
    } 
    else {
        window.showErrorMessage('BeebVSC: \'Error saving tasks.json file\' - contact developer');
    }
    // Now want to save the selection to the settings.json file in the .vscode folder
    // Check if it exists first
    const settingsPath = path.join(getWorkspacePath(), '.vscode', 'settings.json');
    if (!fileExists(settingsPath)) {
        CreateNewLocalSettingsJson(selection, target);
    }
    else {
        // settings.json exists, so load it
        let settingsObject: any = null;
        try {
            settingsObject = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            console.log('settings.json loaded');
        }
        catch (err) {
            window.showErrorMessage('Could not load settings.json file');
            return;
        }
        // sanity check - ensure beebvsc settings are included exists
        if (!('beebvsc' in settingsObject)) {
            settingsObject['beebvsc'] = {};
            console.log('Added beebvsc object to settings.json');
        }
        // now add the new settings
        settingsObject['beebvsc']['sourceFile'] = path.join(rootPath, selection);
        settingsObject['beebvsc']['targetName'] = target;
        // save the settings.json file
        try {
            const output = JSON.stringify(settingsObject, null, 4);
            fs.writeFileSync(settingsPath, output, 'utf8');
        }
        catch (err) {
            window.showErrorMessage('BeebVSC \'' + err + '\', when saving file \'settings.json\'');
            console.log('error saving settings.json \'' + err + '\'');
            return;
        }
        console.log('settings.json saved');
    }
}


//----------------------------------------------------------------------------------------
// present the user with a list of current build targets in the tasks.json file
// any selection will update the tasks.json file to have the new target as the default
// build target.
// the tests tasks will also be updated to reflect the new build target.
//----------------------------------------------------------------------------------------
function selectTargetCommand(): void
{
    // to select a default target some pre-requisites are needed
    // assembler configuration must be set (user or workspace) - prompt to set if not
    // emulator configuration must be set (user or workspace) - prompt to set if not
    if (!checkConfiguration())
        return;    
        
    // Plus must have at least one target in the list of tasks
    // now we load the tasks.json
    const tasksObject = loadTasks();
    // sanity check - can't see how this might happen unless running on weird platform or with weird file permissions
    if (tasksObject === null) {
        window.showErrorMessage('BeebVSC: \'Error loading tasks.json file\' - could not select new target');
        return;
    }

    const targetList = [];
    const tasks = tasksObject.tasks;
    if (tasks.length === 0) {
        window.showErrorMessage('BeebVSC: No targets available in tasks.json file');
        return;
    }

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (typeof task.group === 'object' && task.group.kind === 'build') {
            targetList.push(task.label);
        }
    }

    // show popup list picker in VSC for user to select desired new target file
    const pickOptions = { 'ignoreFocusOut' : true, 'placeHolder' : 'Select a build target Choose a new default target file' };
    window.showQuickPick(targetList, pickOptions).then((selection) => {
        // if focus lost, or user cancelled
        if (selection === undefined) {
            console.log('bad selection');
            return;
        }
        console.log('selected \'' + selection + '\'');

        // set the selection as the new default build target + test command
        setCurrentTarget(tasksObject, selection);

        // write the new tasks.json file
        if (saveTasks(tasksObject)) {
            window.showInformationMessage('BeebVSC - selected new build target \'' + selection + '\'');
        } 
        else {
            window.showErrorMessage('BeebVSC Error updating tasks.json - build target \' ' + selection + '\'');
        }
    });
}

function GetSAVECommands(ASMFilename: string): string[] {
    const saveList: string[] = [];
    const rootPath = getWorkspacePath();
    // Confident this exists as we've already checked for it in calling function
    const textFile = fs.readFileSync(path.join(rootPath, ASMFilename), 'utf8');
    const lines = textFile.split('\n');
	
    // TODO: Exclude commented out lines
    const saveCommandRegex = /(^|:)\s*(SAVE\s+)((["'])([^\4]+)\4).*$/im;
    for (let i = 0; i < lines.length; i++) {
        const match = saveCommandRegex.exec(lines[i]);
        if (match !== null && match.length > 5) {
            saveList.push(match[5]);
        }
    }
    return saveList;
}


//----------------------------------------------------------------------------------------
// load the tasks.json file from the local workspace
// returns the file as a JS object or null if there was an error
// if no tasks.json file exists, a default will be created.
//----------------------------------------------------------------------------------------
function loadTasks(): VSTasks | null
{
    if (!checkConfiguration())
    {
        return null;    
    }

    // if no tasks.json file exists, create a default
    const tasksPath = getTasksPath();
    if (!fileExists(tasksPath)) {
        const tasksObject = tasksHeader;
        // if tasks file could not be saved, return null to indicate problem
        if (!saveTasks(tasksObject)) {
            return null;
        }
    }

    // load the tasks.json file
    let tasksObject: any = null;
    try {
        const contents = fs.readFileSync(tasksPath, 'utf8');
        tasksObject = JSON.parse(contents);
        console.log('tasks.json loaded');
    }
    catch (err) {
        window.showErrorMessage('Could not load tasks.json file');
        return null;
    }

    // sanity check - ensure a tasks array exists
    if (!('tasks' in tasksObject)) {
        tasksObject['tasks'] = [];
        console.log('Added tasks array to tasks.json');
    }

    return tasksObject;
}

function saveTasks(tasksObject: VSTasks): boolean {
    const vscodePath = getVSCodePath();
    // sanity check that .vscode is not a file
    if (fileExists(vscodePath)) {
        window.showErrorMessage('BeebVSC: \'.vscode\' exists as a file rather than a directory! Unexpected - Please resolve.');
        return false;
    }

    // create .vscode directory if it doesn't exist
    if (!dirExists(vscodePath)) {
        fs.mkdirSync(vscodePath);
    }

    // now we can write the tasks.json file
    const tasksPath = getTasksPath();
    try {
        const output = JSON.stringify(tasksObject, null, 4);
        fs.writeFileSync(tasksPath, output, 'utf8');
    }
    catch (err) {
        window.showErrorMessage('BeebVSC \'' + err + '\', when saving file \'tasks.json\'');
        console.log('error saving tasks.json \'' + err + '\'');
        return false;
    }
    console.log('tasks.json saved');
    return true;
}

function getTargetName(sourceFile: string) {
    const ext = sourceFile.lastIndexOf('.');
    if (ext === -1) {
        return sourceFile + targetExt;
    }
    else {
        return sourceFile.substring(0, ext) + targetExt;
    }
}
