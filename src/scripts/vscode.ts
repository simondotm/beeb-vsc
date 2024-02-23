import { provideVSCodeDesignSystem, vsCodeButton, vsCodeCheckbox, vsCodeDivider, vsCodeDropdown, vsCodeOption, vsCodeTextField } from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeCheckbox(), vsCodeTextField(), vsCodeDivider(), vsCodeDropdown(), vsCodeOption());

export const vscode = acquireVsCodeApi();
