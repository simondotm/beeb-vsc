import { provideVSCodeDesignSystem, vsCodeButton, vsCodeCheckbox, vsCodeDivider, vsCodeTextField } from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeCheckbox(), vsCodeTextField(), vsCodeDivider());

export const vscode = acquireVsCodeApi();
